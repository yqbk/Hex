const _ = require('lodash')
const redis = require('redis')
const bluebird = require('bluebird')
const uuid = require('uuid')
const mapFile = require('./static/map.json')
const actions = require('./app/scripts/actions')

bluebird.promisifyAll(redis.RedisClient.prototype)
bluebird.promisifyAll(redis.Multi.prototype)
const client = redis.createClient(process.env.REDIS_URL)
const lock = require('redis-lock')(client)

const socketServer = require('./socketServer')

client.on('connect', async () => {
  await client.flushall()
  console.log('Redis databases cleared')
})

const moves = {}

// redis databases
// 0 - user
// 1-4 - hexes

async function getMap (id, roomId) {
  try {
    const { db } = socketServer.getRoom(roomId)
    await client.select(db)
    const mapKeys = await client.keysAsync('*')
    const map = {}
    for (const key in mapKeys) { // eslint-disable-line
      map[key] = JSON.parse(await client.getAsync(key)) // eslint-disable-line
    }
    socketServer.send(id, [{ type: actions.GET_MAP, payload: { map } }])
  } catch (err) {
    console.error(err)
  }
}

async function checkWinner (roomId) {
  try {
    const room = socketServer.getRoom(roomId)
    const winner = Object.keys(room.castles).reduce((acc, key) => (
      acc === null ? room.castles[key] : (((room.castles[key] === acc || !room.castles[key]) && acc) || undefined)
    ), null)

    const playerFields = Object.keys(room.castles).filter(key => room.castles[key])

    if (playerFields.length > 1 && winner) {
      console.log('winner', winner)
      const player = socketServer.getPlayer(winner)
      room.winner = _.omit(player, ['socket'])
      socketServer.emit(roomId, [{ type: actions.WINNER, payload: { room } }])
    } else {
      console.log('winner', winner, playerFields, room)
    }
  } catch (err) {
    console.error(err)
  }
}

async function spawnArmy (roomId, hexId) {
  lock(`armyAccess${roomId}`, async (done) => {
    try {
      const { db } = socketServer.getRoom(roomId)
      await client.select(db)
      const hex = JSON.parse(await client.getAsync(hexId))
      const hexArmy = hex.army || 0
      const nexArmy = hexArmy + 10
      hex.army = nexArmy > 100 ? hexArmy : nexArmy
      const player = hex.owner
      await client.setAsync(hexId, JSON.stringify(hex))
      socketServer.emit(roomId, [{
        type: 'CHANGE_HEX_ARMY_VALUE',
        payload: { player, hexId, armyValue: hex.army }
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

async function register (id, roomId, { hexId }) {
  lock(`armyAccess${roomId}`, async (done) => {
    const { db } = socketServer.getRoom(roomId)
    const player = socketServer.getPlayer(id)
    try {
      await client.select(db)
      const hex = JSON.parse(await client.getAsync(hexId))
      hex.owner = _.omit(player, ['socket'])

      await client.setAsync(hexId, JSON.stringify(hex))

      spawnArmy(roomId, hexId)
      const room = socketServer.getRoom(roomId)
      socketServer.addRoom(roomId, { castles: Object.assign({}, room.castles, { [hexId]: hex.owner.id }) })
      // checkWinner(roomId)

      // socketServer.emit(roomId, [{ type: 'PLAYER_REGISTERED', payload: { hexId, player } }])
    } catch ({ message }) {
      console.log(message)
      socketServer.send(id, [{ type: 'ERROR_MESSAGE', payload: { message } }])
    }
    done()
  })
}

const getDistance = ({ x: x1, y: y1 }, { x: x2, y: y2 }) => Math.sqrt(((x2 - x1) ** 2) + ((y2 - y1) ** 2))

async function getNextHex ({ hexFrom, hexTo, db }) {
  try {
    await client.select(db)
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
  try {
    const { db } = socketServer.getRoom(roomId)
    await client.select(db)
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
}

async function armyMove (id, roomId, { from, to, number, patrol, moveId }, beginning) {
  lock(`armyAccess${roomId}`, async (done) => {
    try {
      const { db } = socketServer.getRoom(roomId)
      await client.select(db)
      const [hexFrom, hexTo] = (await Promise.all([
        client.getAsync(from),
        client.getAsync(to)
      ])).map(JSON.parse)

      const hexFromOwner = hexFrom.owner
      const hexFromArmy = hexFrom.army || 0

      const nextHex = await getNextHex({ hexFrom, hexTo, db })

      if (nextHex && hexFromOwner && hexFromOwner.id === id && hexFromArmy && nextHex.type !== 'water') {
        const nextHexArmy = nextHex.army || 0
        const nextHexOwner = nextHex.owner

        if (!nextHexOwner || nextHexOwner.id === id || (nextHexOwner && !nextHexArmy)) {
          if (nextHex.castle && !nextHex.owner) {
            spawnArmy(roomId, nextHex.id)
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

          socketServer.emit(roomId, [
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

          if (nextHex.castle) {
            const room = socketServer.getRoom(roomId)
            socketServer.addRoom(roomId, { castles: Object.assign({}, room.castles, { [to]: hexFrom.owner.id }) })
            checkWinner(roomId)
          }
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

          socketServer.emit(roomId, [{
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
}

function battle (roomId, { attackerId, defenderId, attackerHexId, defenderHexId }) {
  lock(`armyAccess${roomId}`, async (done) => {
    try {
      const { db } = socketServer.getRoom(roomId)
      await client.select(db)
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

        socketServer.emit(roomId, [
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

        socketServer.emit(roomId, [
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

        socketServer.emit(roomId, [
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

async function startDuel (player1Id, player2Id, availableRoom) {
  try {
    const roomId = uuid.v4()
    const player1 = socketServer.getPlayer(player1Id)
    const player2 = socketServer.getPlayer(player2Id)

    const spawnPositions = _.shuffle([20, 76])
    // room.players.forEach((player) => {
    //   const spawnPosition = spawnPositions.pop()
    //   register(player.id, roomId, { hexId: spawnPosition })
    //   socketServer.send(player.id, [{ type: actions.MAP_LOADED, payload: { room: { ...room, spawnPosition } } }])
    // })

    const players = [player1, player2].map(player => ({
      id: player.id,
      username: player.username,
      color: player.color,
      status: 'joined',
      spawnPosition: spawnPositions.pop()
    }))

    const status = 'loading'

    const room = {
      roomId,
      players,
      status,
      db: availableRoom,
      castles: { 20: null, 76: null, 200: null, 57: null, 177: null, 13: null, 98: null }
    }

    // await client.select(2)
    // await client.setAsync(roomId, JSON.stringify(room))

    await client.select(availableRoom)
    await Promise.all(mapFile.map(async (hex) => { await client.setAsync(hex.id, JSON.stringify(hex)) }))
    console.log('Map inserted into redis')

    socketServer.addRoom(roomId, room)
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
    const room = socketServer.getRoom(roomId)

    room.players = room.players.map(player => (
      player.id === id
        ? Object.assign({}, player, { status: 'loaded' })
        : player
    ))

    socketServer.emit(roomId, [{ type: actions.MAP_LOADED, payload: { room } }])

    const notLoadedPlayers = room.players.filter(player => player.status !== 'loaded')
    if (!notLoadedPlayers.length) {
      room.status = 'loaded'
    }

    socketServer.addRoom(roomId, room)

    if (!notLoadedPlayers.length) {
      // await new Promise(resolve => setTimeout(resolve, 3000))
      room.players.forEach((player) => {
        register(player.id, roomId, { hexId: player.spawnPosition })
        socketServer.send(player.id, [{ type: actions.MAP_LOADED, payload: { room } }])
      })
    }
  } catch (err) {
    console.error(err)
  }
}

async function getRoomRedisNumber () {
  try {
    const roomDbs = [1, 2, 3, 4, 6]
    for (let i = 0; i < roomDbs.length; i += 1) {
      await client.select(roomDbs[i]) // eslint-disable-line
      const dbSize = await client.dbsizeAsync() // eslint-disable-line
      if (dbSize === 0) {
        return roomDbs[i]
      }
    }
  } catch (err) {
    console.error(err)
  }
  return null
}

module.exports = {
  getMap,
  register,
  armyMove,
  stopMove,
  startDuel,
  playerLoadedMap,
  getRoomRedisNumber
}
