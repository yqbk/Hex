const express = require('express')
const http = require('http')
const history = require('connect-history-api-fallback')
const config = require('./webpack.config')
const webpack = require('webpack')
const WebSocket = require('ws')
const uuid = require('uuid')
const redisController = require('./redisController')

const port = process.env.PORT || 5000
const compiler = webpack(config)
const app = express()
const server = http.createServer(app)

app.get('/register', redisController.register)
app.get('/map', redisController.getMap)

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

function connect () {
  const callbacks = {}

  ws.on('connection', (socket) => {
    const newPlayerId = uuid.v4()
    players.push({ id: newPlayerId, socket })

    socket.on('message', (message) => {
      const { id, type, payload } = JSON.parse(message)
      callbacks[type](id, payload)
    })

    socket.on('close', () => {
      players = players.filter(player => player.id !== newPlayerId)
    })
  })

  return {
    register: function (type, callback) { // eslint-disable-line
      callbacks[type] = callback
      return this
    }
  }
}

connect()
  .register('ARMY_MOVE', (id, { from, to, number, patrol }) => {
    redisController.armyMove(id, { from, to, number, patrol }, from)
    redisController.calculatePath(id, { from, to }, from)
  })

setInterval(() => {
  if (redisController.getBuffer().length > 0) {
    players.forEach(({ socket }) => {
      try {
        socket.send(JSON.stringify(redisController.getBuffer()))
      } catch (err) {
        console.log(err)
      }
    })
    redisController.clearBuffer()
  }
}, 100)
