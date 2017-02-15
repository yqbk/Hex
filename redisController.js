const redis = require('redis')
const bluebird = require('bluebird')
const uuid = require('uuid')
const mapFile = require('./static/map.json')

bluebird.promisifyAll(redis.RedisClient.prototype)
bluebird.promisifyAll(redis.Multi.prototype)
const client = redis.createClient(process.env.REDIS_URL)

client.on('connect', async () => {
  await client.flushall()
  console.log('Redis databases cleared')
  await client.select(1)
  await Promise.all(mapFile.map(async (hex) => { await client.setAsync(hex.id, JSON.stringify(hex)) }))
  console.log('Map inserted into redis')
})

let buffer = []
const battles = {}

const getBuffer = () => buffer
const clearBuffer = () => {
  buffer = []
}

const randomColor = () => {
  const number = Math.floor(Math.random() * 16777215) + 1
  return number.toString(16)
}

// redis databases
// 0 - user
// 1 - hex

async function getMap (req, res) {
  try {
    await client.select(1)
    const mapKeys = await client.keysAsync('*')
    const map = await Promise.all(mapKeys.map(async key => JSON.parse(await client.getAsync(key))))
    res.json(map.sort((a, b) => a.id - b.id))
  } catch (err) {
    res.status(500).json([])
  }
}

async function register (req, res) {
  const { name, hexId } = req.query
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

    const { id: randomHexNeighbourId } = hex.neighbours[Math.floor(Math.random() * hex.neighbours.length)]
    const hexNeighbour = JSON.parse(await client.getAsync(randomHexNeighbourId))
    hexNeighbour.army = 100
    hexNeighbour.owner = player

    await Promise.all([
      await client.setAsync(randomHexNeighbourId, JSON.stringify(hexNeighbour)),
      await client.setAsync(hexId, JSON.stringify(hex))
    ])

    buffer.push({ type: 'PLAYER_REGISTERED', payload: { hexId, player } })
    buffer.push({
      type: 'CHANGE_HEX_ARMY_VALUE',
      payload: { player, hexId: randomHexNeighbourId, armyValue: hexNeighbour.army }
    })
    res.send(playerId)
  } catch ({ message }) {
    res.status(500).send(message)
  }
}

const sortIds = (id1, id2) => [id1, id2].sort().join('')

function battle ({ attackerId, defenderId, attackerHexId, defenderHexId, instant }) {
  battles[sortIds(attackerHexId, defenderHexId)] = setTimeout(async () => {
    try {
      await client.select(1)
      const [attackerHex, defenderHex] = (await Promise.all([
        await client.getAsync(attackerHexId),
        await client.getAsync(defenderHexId)
      ])).map(JSON.parse)

      let attackerHexArmy = attackerHex.army || 0
      let defenderHexArmy = defenderHex.army || 0

      const attackerDice = attackerHexArmy
        ? Math.floor(Math.random() * (attackerHexArmy > 20 ? 20 : attackerHexArmy)) + 1 : 0
      const defenderDice = defenderHexArmy
        ? Math.floor(Math.random() * (defenderHexArmy > 20 ? 20 : defenderHexArmy)) + 1 : 0

      attackerHexArmy -= defenderDice
      defenderHexArmy -= attackerDice

      if (attackerHexArmy > 0 && defenderHexArmy > 0) {
        attackerHex.army = attackerHexArmy < 0 ? 0 : attackerHexArmy
        defenderHex.army = defenderHexArmy < 0 ? 0 : defenderHexArmy

        await Promise.all([
          await client.setAsync(attackerHexId, JSON.stringify(attackerHex)),
          await client.setAsync(defenderHexId, JSON.stringify(defenderHex))
        ])

        buffer.push({
          type: 'CHANGE_HEX_ARMY_VALUE',
          payload: { hexId: attackerHexId, armyValue: attackerHexArmy }
        })
        buffer.push({
          type: 'CHANGE_HEX_ARMY_VALUE',
          payload: { hexId: defenderHexId, armyValue: defenderHexArmy }
        })

        battle({ attackerId, defenderId, attackerHexId, defenderHexId })
      } else {
        await client.select(0)
        const [newOwner, [newAttackerHexArmy, newDefenderHexArmy]] = [
          JSON.parse(await client.getAsync(attackerHexArmy > defenderHexArmy ? attackerId : defenderId)),
          attackerHexArmy > defenderHexArmy ? [0, attackerHexArmy] : [0, defenderHexArmy]
        ]

        await client.select(1)
        attackerHex.army = newAttackerHexArmy < 0 ? 0 : newAttackerHexArmy
        defenderHex.army = newDefenderHexArmy < 0 ? 0 : newDefenderHexArmy
        defenderHex.owner = newOwner

        await Promise.all([
          await client.setAsync(attackerHexId, JSON.stringify(attackerHex)),
          await client.setAsync(defenderHexId, JSON.stringify(defenderHex))
        ])

        buffer.push({
          type: 'CHANGE_HEX_ARMY_VALUE',
          payload: { hexId: attackerHexId, armyValue: attackerHex.army }
        })
        buffer.push({
          type: 'CHANGE_HEX_ARMY_VALUE',
          payload: { hexId: defenderHexId, armyValue: defenderHex.army, player: newOwner }
        })
      }
    } catch (err) {
      console.log(err)
    }
  }, instant ? 0 : 1000)
}

async function armyMove (id, { from, to, number }) {
  try {
    await client.select(0)

    await client.select(1)

    const [hexFrom, hexTo] = (await Promise.all([
      await client.getAsync(from),
      await client.getAsync(to)
    ])).map(JSON.parse)

    const hexFromArmy = hexFrom.army || 0
    const hexToArmy = hexTo.army || 0
    const hexFromOwner = hexFrom.owner
    const hexToOwner = hexTo.owner

    if (hexFromOwner && hexFromOwner.id === id) {
      if (!hexToOwner || hexToOwner.id === id) {
        hexTo.owner = hexFrom.owner
        const armyToMove = number || hexFromArmy
        hexTo.army = hexToArmy + (armyToMove > hexFromArmy ? hexFromArmy : armyToMove)
        hexFrom.army = (armyToMove === undefined || armyToMove > hexFromArmy) ? 0 : hexFromArmy - armyToMove

        await Promise.all([
          await client.setAsync(from, JSON.stringify(hexFrom)),
          await client.setAsync(to, JSON.stringify(hexTo))
        ])

        buffer.push({
          type: 'CHANGE_HEX_ARMY_VALUE',
          payload: { hexId: from, armyValue: hexFrom.army, player: hexFrom.owner }
        })
        buffer.push({
          type: 'CHANGE_HEX_ARMY_VALUE',
          payload: { hexId: to, armyValue: hexTo.army, player: hexFrom.owner }
        })
      } else {
        battle({
          attackerId: hexFromOwner.id,
          defenderId: hexToOwner.id,
          attackerHexId: hexFrom.id,
          defenderHexId: hexTo.id,
          instant: true
        })
      }
    }
  } catch ({ message }) {
    console.log(message)
  }
}

module.exports = {
  getBuffer,
  clearBuffer,
  getMap,
  register,
  armyMove
}
