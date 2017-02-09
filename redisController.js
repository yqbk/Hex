const redis = require('redis')
const bluebird = require('bluebird')
const uuid = require('uuid')
const mapFile = require('./static/map.json')

bluebird.promisifyAll(redis.RedisClient.prototype)
bluebird.promisifyAll(redis.Multi.prototype)
const client = redis.createClient()

client.on('connect', async () => {
  await client.flushall()
  console.log('Redis databases cleared')
  await client.select(1)
  await Promise.all(mapFile.map(async (hex) => { await client.setAsync(hex.id, JSON.stringify(hex)) }))
  console.log('Map inserted into redis')
})

let buffer = []

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
  const user = { name, color: randomColor() }
  const playerId = uuid.v4()
  try {
    await client.select(1)
    const hex = JSON.parse(await client.getAsync(hexId))
    if (hex.owner) {
      throw new Error('This field is already taken')
    }
    hex.owner = playerId

    const randomHexNeighbourId = hex.neighbours[Math.floor(Math.random() * hex.neighbours.length)]
    const hexNeighbour = JSON.parse(await client.getAsync(randomHexNeighbourId))
    hexNeighbour.army = 10
    await client.setAsync(randomHexNeighbourId, JSON.stringify(hexNeighbour))

    await client.setAsync(hexId, JSON.stringify(hex))
    await client.select(0)
    await client.setAsync(playerId, JSON.stringify(user))

    buffer.push({ type: 'PLAYER_REGISTERED', payload: user })
    buffer.push({ type: 'SPAWN_CASTLE', payload: { playerId, hexId } })
    buffer.push({ type: 'SPAWN_ARMY', payload: { playerId, hexId: randomHexNeighbourId, armyValue: 10 } })
    res.send(playerId)
  } catch (err) {
    console.log(err)
    res.status(500).send(err.message)
  }
}

async function armyMove (id, payload) {
  const data = await client.getAsync(id)
  console.log(payload, data)
}

module.exports = {
  getBuffer,
  clearBuffer,
  getMap,
  register,
  armyMove
}
