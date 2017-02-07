const express = require('express')
const http = require('http')
const history = require('connect-history-api-fallback')
const config = require('./webpack.config')
const webpack = require('webpack')
const WebSocket = require('ws')
const redis = require('redis')
const bluebird = require('bluebird')
const uuid = require('uuid')

bluebird.promisifyAll(redis.RedisClient.prototype)
bluebird.promisifyAll(redis.Multi.prototype)
const client = redis.createClient()

client.on('connect', () => {
  client.flushall()
})

const port = process.env.PORT || 5000
const compiler = webpack(config)
const app = express()
const server = http.createServer(app)
let buffer = []

// redis databases
// 0 - users
// 1 - hex

const randomColor = () => {
  const number = Math.floor(Math.random() * 16777215) + 1
  return number.toString(16)
}

app.get('/register', async (req, res) => {
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
})

app.use(history({
  index: '/index.html'
}))
app.use(express.static('static'))
app.use(require('webpack-dev-middleware')(compiler, {
  noInfo: true,
  publicPath: config.output.publicPath
}))
app.use(require('webpack-hot-middleware')(compiler))

server.listen(port, '0.0.0.0', (err) => {
  if (err) {
    console.log(err) // eslint-disable-line
    return
  }
  console.log(`Listening on port ${port}`) // eslint-disable-line
})

// ------------ WebSockets ---------------

const ws = new WebSocket.Server({ server })
let players = []

ws.on('connection', (socket) => {
  const id = uuid.v4()
  players.push({ id, socket })

  socket.on('message', () => {
    // console.log('received: %s', message)
  })

  socket.on('close', () => {
    players = players.filter(player => player.id !== id)
  })
})

setInterval(() => {
  players.forEach(({ socket }) => {
    socket.send(JSON.stringify(buffer))
  })
  buffer = []
}, 1000)
