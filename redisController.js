const redis = require('redis')
const bluebird = require('bluebird')
const uuid = require('uuid')
const mapFile = require('./static/map.json')
const actions = require('./app/scripts/actions')

bluebird.promisifyAll(redis.RedisClient.prototype)
bluebird.promisifyAll(redis.Multi.prototype)
const client = redis.createClient(process.env.REDIS_URL)
const lock = require('redis-lock')(client)

const socketServer = require('./socketServer')(client)

client.on('connect', async () => {
  await client.flushall()
  console.log('Redis databases cleared')
  await client.select(1)
  await Promise.all(mapFile.map(async (hex) => { await client.setAsync(hex.id, JSON.stringify(hex)) }))
  console.log('Map inserted into redis')
})

const moves = {}

const randomColor = () => {
  const number = Math.floor(Math.random() * 16777215) + 1
  return number.toString(16)
}

// redis databases
// 0 - user
// 1 - hex
// 2 - rooms

async function getMap (req, res) {
  try {
    await client.select(1)
    const mapKeys = await client.keysAsync('*')
    const map = {}
    for (const key in mapKeys) { // eslint-disable-line
      map[key] = JSON.parse(await client.getAsync(key)) // eslint-disable-line
    }
    res.json(map)
  } catch (err) {
    res.status(500).json([])
  }
}

async function spawnArmy (roomId, hexId) {
  lock('armyAccess', async (done) => {
    try {
      await client.select(1)
      const hex = JSON.parse(await client.getAsync(hexId))
      const hexArmy = hex.army || 0
      const nexArmy = hexArmy + 10
      hex.army = nexArmy > 100 ? hexArmy : nexArmy
      await client.setAsync(hexId, JSON.stringify(hex))
      await socketServer.emit(roomId, [{
        type: 'CHANGE_HEX_ARMY_VALUE',
        payload: { hexId, armyValue: hex.army }
      }])

      setTimeout(() => {
        spawnArmy(roomId, hexId)
      }, 5000)
    } catch (err) {
      console.error(err)
    }
    done()
  })
}

async function register (id, roomId, { name, hexId }) {
  lock('armyAccess', async (done) => {
    const playerId = uuid.v4()
    const player = { id: playerId, name, color: randomColor() }
    try {
      await client.select(0)
      await client.setAsync(playerId, JSON.stringify(player))

      await client.select(1)
      const hex = JSON.parse(await client.getAsync(hexId))
      if (!hex.castle) {
        throw new Error('You need to choose a castle')
      }
      if (hex.owner) {
        throw new Error('This field is already taken')
      }
      hex.owner = player

      await client.setAsync(hexId, JSON.stringify(hex))

      spawnArmy(roomId, hexId)

      await socketServer.emit(roomId, [{ type: 'PLAYER_REGISTERED', payload: { hexId, player } }])
      socketServer.send(id, [{ type: 'REGISTER', payload: { playerId } }])
    } catch ({ message }) {
      socketServer.send(id, [{ type: 'ERROR_MESSAGE', payload: { message } }])
    }
    done()
  })
}

const getDistance = ({ x: x1, y: y1 }, { x: x2, y: y2 }) => Math.sqrt(((x2 - x1) ** 2) + ((y2 - y1) ** 2))

async function getNextHex ({ hexFrom, hexTo }) {
  try {
    await client.select(1)
    return (await Promise.all(hexFrom.neighbours.map(({ id }) => client.getAsync(id))))
      .map(JSON.parse)
      .reduce((acc, n) => {
        const newDistance = getDistance(n, hexTo)
        return {
          ...(
            newDistance <= acc.minDistance && n.type !== 'water'
              ? { minDistance: newDistance, hex: n }
              : acc
          )
        }
      }, { minDistance: getDistance(hexFrom, hexTo) }).hex
  } catch (err) {
    console.error(err)
  }
  return {}
}

async function stopMove (id, roomId, { hexId }) {
  const start = +new Date()
  try {
    await client.select(1)
    const hex = JSON.parse(await client.getAsync(hexId))
    if (hex.owner && hex.owner.id === id && hex.moveId) {
      const { timeoutId, destination } = moves[hex.moveId] || {}
      clearTimeout(timeoutId)
      socketServer.send(id, [{ type: 'CLEAR_DESTINATION', payload: { hexId, destination } }])
      delete moves[hex.moveId]
    }
  } catch (err) {
    console.error('stopMove', err)
  }
  console.log('stopMove', +new Date() - start)
}

async function armyMove (id, roomId, { from, to, number, patrol, moveId }, beginning) {
  const start = +new Date()
  lock('armyAccess', async (done) => {
    try {
      await client.select(1)
      const [hexFrom, hexTo] = (await Promise.all([
        client.getAsync(from),
        client.getAsync(to)
      ])).map(JSON.parse)

      const hexFromOwner = hexFrom.owner
      const hexFromArmy = hexFrom.army || 0

      const nextHex = await getNextHex({ hexFrom, hexTo })

      if (nextHex && hexFromOwner && hexFromOwner.id === id && hexFromArmy && nextHex.type !== 'water') {
        const nextHexArmy = nextHex.army || 0
        const nextHexOwner = nextHex.owner

        if (!nextHexOwner || nextHexOwner.id === id || (nextHexOwner && !nextHexArmy)) {
          if (nextHex.castle && !nextHex.owner) {
            spawnArmy(id, nextHex.id)
          }

          nextHex.owner = hexFrom.owner
          const armyToMove = number || hexFromArmy
          nextHex.army = nextHexArmy + (armyToMove > hexFromArmy ? hexFromArmy : armyToMove)
          hexFrom.army = (armyToMove === undefined || armyToMove > hexFromArmy) ? 0 : hexFromArmy - armyToMove

          const timeoutId = (
            (nextHex.id !== hexTo.id && setTimeout(() => {
              armyMove(id, roomId, { from: nextHex.id, to: hexTo.id, number: number || armyToMove, patrol, moveId },
                beginning)
            }, 500)) ||
            (nextHex.id === hexTo.id && patrol && setTimeout(() => {
              armyMove(id, roomId, { from: nextHex.id, to: beginning, number: number || armyToMove, patrol, moveId },
                nextHex.id)
            }, 500)) || null
          )

          const destination = patrol ? [beginning, to] : [to]
          const hexId = nextHex.id
          hexFrom.moveId = null

          if (timeoutId) {
            moves[moveId] = { hexId, timeoutId, playerId: id, destination }
            nextHex.moveId = moveId
            socketServer.send(id, [{ type: 'GET_DESTINATION', payload: { hexId, destination } }])
          } else {
            socketServer.send(id, [{ type: 'CLEAR_DESTINATION', payload: { hexId, destination } }])
          }

          await Promise.all([
            client.setAsync(from, JSON.stringify(hexFrom)),
            client.setAsync(nextHex.id, JSON.stringify(nextHex))
          ])

          await socketServer.emit(roomId, [
            {
              type: 'CHANGE_HEX_ARMY_VALUE',
              payload: { hexId: from, armyValue: hexFrom.army, player: hexFrom.owner, moveId: null }
            },
            {
              type: 'CHANGE_HEX_ARMY_VALUE',
              payload: Object.assign({}, {
                hexId: nextHex.id,
                armyValue: nextHex.army,
                player: nextHex.owner,
                from: hexFrom.id
              }, timeoutId ? { moveId } : { moveId: null })
            }
          ])
        } else {
          // stopMove(nextHexOwner.id, { hexId: nextHex.id }, send)
          const { hexId, destination } = moves[moveId] || {}
          if (hexId) {
            socketServer.send(id, [{ type: 'CLEAR_DESTINATION', payload: { hexId, destination } }])
          }

          battle(roomId, { // eslint-disable-line
            attackerId: hexFromOwner.id,
            defenderId: nextHexOwner.id,
            attackerHexId: hexFrom.id,
            defenderHexId: nextHex.id
          })

          await socketServer.emit(roomId, [{
            type: 'SET_BATTLE',
            payload: { attackerId: hexFrom.id, defenderId: nextHex.id, state: true }
          }])
        }
      }
    } catch (err) {
      console.error('armyMove', err)
    }
    done()
  })
  console.log('armyMove', +new Date() - start)
}

function battle (roomId, { attackerId, defenderId, attackerHexId, defenderHexId }) {
  lock('armyAccess', async (done) => {
    try {
      await client.select(1)
      const [attackerHex, defenderHex] = (await Promise.all([
        client.getAsync(attackerHexId),
        client.getAsync(defenderHexId)
      ])).map(JSON.parse)

      let attackerHexArmy = attackerHex.army || 0
      let defenderHexArmy = defenderHex.army || 0

      const attackerDice = attackerHexArmy
        ? Math.floor(Math.random() * (attackerHexArmy > 20 ? 20 : attackerHexArmy)) + 1 : 0
      const defenderDice = defenderHexArmy
        ? Math.floor(Math.random() * (defenderHexArmy > 20 ? 20 : defenderHexArmy)) + 1 : 0

      attackerHexArmy -= defenderDice
      defenderHexArmy -= attackerDice

      attackerHex.army = attackerHexArmy < 0 ? 0 : attackerHexArmy
      defenderHex.army = defenderHexArmy < 0 ? 0 : defenderHexArmy

      if (attackerHex.owner.id !== defenderHex.owner.id && attackerHexArmy > 0 && defenderHexArmy > 0) {
        await Promise.all([
          client.setAsync(attackerHexId, JSON.stringify(attackerHex)),
          client.setAsync(defenderHexId, JSON.stringify(defenderHex))
        ])

        await socketServer.emit(roomId, [
          {
            type: 'CHANGE_HEX_ARMY_VALUE',
            payload: { hexId: attackerHexId, armyValue: attackerHexArmy }
          },
          {
            type: 'CHANGE_HEX_ARMY_VALUE',
            payload: { hexId: defenderHexId, armyValue: defenderHexArmy }
          }
        ])

        setTimeout(() => battle(roomId, { attackerId, defenderId, attackerHexId, defenderHexId }), 1000)
      } else if (attackerHexArmy > defenderHexArmy || attackerHex.owner.id === defenderHex.owner.id) {
        defenderHex.owner = attackerHex.owner

        await Promise.all([
          client.setAsync(attackerHexId, JSON.stringify(attackerHex)),
          client.setAsync(defenderHexId, JSON.stringify(defenderHex))
        ])

        const moveId = uuid.v1()
        armyMove(attackerHex.owner.id, roomId, {
          from: attackerHex.id,
          to: defenderHex.id,
          moveId
        }, attackerHex.id)

        await socketServer.emit(roomId, [
          {
            type: 'SET_BATTLE',
            payload: { attackerId: attackerHexId, defenderId: defenderHexId, state: false }
          }
        ])
      } else {
        await Promise.all([
          client.setAsync(attackerHexId, JSON.stringify(attackerHex)),
          client.setAsync(defenderHexId, JSON.stringify(defenderHex))
        ])

        await socketServer.emit(roomId, [
          {
            type: 'CHANGE_HEX_ARMY_VALUE',
            payload: { hexId: attackerHexId, armyValue: attackerHex.army }
          },
          {
            type: 'CHANGE_HEX_ARMY_VALUE',
            payload: { hexId: defenderHexId, armyValue: defenderHex.army }
          },
          {
            type: 'SET_BATTLE',
            payload: { attackerId: attackerHexId, defenderId: defenderHexId, state: false }
          }
        ])
      }
    } catch (err) {
      console.error('battle', err)
    }
    done()
  })
}

async function startDuel (player1Id, player2Id) {
  try {
    const roomId = uuid.v4()
    const player1 = socketServer.getPlayer(player1Id)
    const player2 = socketServer.getPlayer(player2Id)

    // socketServer.addPlayer(player1Id, { roomId })
    // socketServer.addPlayer(player2Id, { roomId })

    const players = [
      { id: player1.id, username: player1.username, status: 'joined' },
      { id: player2.id, username: player2.username, status: 'joined' }
    ]

    const status = 'loading'

    const room = { roomId, players, status }

    await client.select(2)
    await client.setAsync(roomId, JSON.stringify(room))
    socketServer.send(player1.id, [{ type: actions.START_COUNTDOWN }])
    socketServer.send(player2.id, [{ type: actions.START_COUNTDOWN }])

    await new Promise(resolve => setTimeout(resolve, 5000))

    socketServer.send(player1.id, [{ type: actions.LOADING_SCREEN, payload: { room } }])
    socketServer.send(player2.id, [{ type: actions.LOADING_SCREEN, payload: { room } }])
  } catch (err) {
    console.error(err)
  }
}

async function playerLoadedMap (id, roomId) {
  try {
    await client.select(2)
    const room = JSON.parse(await client.getAsync(roomId))

    room.players = room.players.map(player => (
      player.id === id
        ? Object.assign({}, player, { status: 'loaded' })
        : player
    ))

    await socketServer.emit(roomId, [{ type: actions.MAP_LOADED, payload: { room } }])

    const notLoadedPlayers = room.players.filter(player => player.status !== 'loaded')
    if (!notLoadedPlayers.length) {
      room.status = 'loaded'
    }

    await client.setAsync(roomId, JSON.stringify(room))

    if (!notLoadedPlayers.length) {
      await new Promise(resolve => setTimeout(resolve, 3000))
      await socketServer.emit(roomId, [{ type: actions.MAP_LOADED, payload: { room } }])
    }
  } catch (err) {
    console.error(err)
  }
}

module.exports = {
  getMap,
  register,
  armyMove,
  stopMove,
  startDuel,
  playerLoadedMap
}
