const express = require('express')
const http = require('http')
const history = require('connect-history-api-fallback')
const config = require('./webpack.config')
const webpack = require('webpack')
const uuid = require('uuid')
const redisController = require('./redisController')
const socketServer = require('./socketServer')
const actions = require('./app/scripts/actions')

const port = process.env.PORT || 5000
const compiler = webpack(config)
const app = express()
const server = http.createServer(app)

// app.get('/map', redisController.getMap)

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

let playersQueue = []

async function checkQueue () {
  const [p1, p2, ...rest] = playersQueue
  if (p1 && p2) {
    const availableRoom = await redisController.getRoomRedisNumber()
    if (availableRoom) {
      playersQueue = rest
      redisController.startDuel(p1, p2, availableRoom)
    }
  }
}

const randomColor = () => {
  const number = Math.floor(Math.random() * 16777215) + 1
  return number.toString(16)
}

socketServer.listener(server)
  .on(actions.GET_MAP, (id, roomId) => {
    redisController.getMap(id, roomId)
  })
  .on(actions.QUEUE_JOINED, async (id, roomId, { username }, socket) => {
    const playerId = id || uuid.v4()
    if (!playersQueue.includes(playerId)) {
      playersQueue = [...playersQueue, playerId]
      socketServer.addPlayer(playerId, { id: playerId, socket, username, color: randomColor() })
      socketServer.send(playerId, [{ type: actions.QUEUE_JOINED, payload: { id: playerId } }])
    }
    await checkQueue()
  })
  .on(actions.MAP_LOADED, (id, roomId) => {
    redisController.playerLoadedMap(id, roomId)
  })
  .on('REGISTER', (id, roomId, { name, hexId }) => {
    // redisController.register(id, roomId, { name, hexId })
  })
  .on('ARMY_MOVE', (id, roomId, { from, to, number, patrol }) => {
    const moveId = uuid.v1()
    redisController.stopMove(id, roomId, { hexId: from })
    redisController.armyMove(id, roomId, { from, to, number, patrol, moveId }, from)
  })
