const redis = require('redis')
const bluebird = require('bluebird')
const uuid = require('uuid')

bluebird.promisifyAll(redis.RedisClient.prototype)
bluebird.promisifyAll(redis.Multi.prototype)
const client = redis.createClient()

client.on('connect', () => {
  client.flushall()
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

async function register (req, res) {
  const { name, hexId } = req.query
  const user = { name, color: randomColor() }
  const id = uuid.v4()
  const result = await client.multi()
    .select(0)
    .set(id, JSON.stringify(user))
    .exec()

  if (result) {
    buffer.push({ type: 'PLAYER_REGISTERED', payload: user })
    buffer.push({ type: 'SPAWN_PLAYER', payload: { id: hexId } })
    res.send(id)
  } else {
    res.status(500)
  }
}

async function armyMove (id, payload) {
  const data = await client.getAsync(id)
  console.log(payload, data)
}

module.exports = {
  getBuffer,
  clearBuffer,
  register,
  armyMove
}
