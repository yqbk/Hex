const express = require('express')
const http = require('http')
const history = require('connect-history-api-fallback')
const config = require('./webpack.config')
const webpack = require('webpack')
// const uuid = require('uuid')
// const redisController = require('./redisController')
// const socketServer = require('./socketServer')
// const actions = require('./app/scripts/actions')

const mainCycle = require('./main/main')

const port = process.env.PORT || 5000
const compiler = webpack(config)
const app = express()
const server = http.createServer(app)

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

mainCycle.start(server)

// const randomColor = () => {
//   const number = Math.floor(Math.random() * 16777215) + 1
//   return number.toString(16)
// }
//
// let playersQueue = []
//
// const onClose = (socket) => {
//   const player = socketServer.getPlayer(socket.id)
//   const rooms = socketServer.getRooms()
//   const players = socketServer.getPlayers()
//   if (player) {
//     socketServer.setRooms(Object.keys(rooms).reduce((acc, key) => {
//       const room = rooms[key]
//       room.players = room.players.filter(p => p.id !== player.id)
//       room.castles = Object.keys(room.castles).reduce((a, k) => ({
//         ...a,
//         [k]: (room.castles[k] === player.id ? null : room.castles[k])
//       }), {})
//       redisController.checkWinner(room.id)
//       return {
//         ...acc,
//         [key]: room
//       }
//     }, {}))
//     socketServer.setPlayers(_.omit(players, [player.id]))
//     playersQueue = playersQueue.filter(playerId => playerId !== player.id)
//   }
// }
//
// socketServer.listener(server, onClose)
//   .on(actions.GET_MAP, (id, roomId) => {
//     redisController.getMap(id, roomId)
//   })
//   .on(actions.QUEUE_JOINED, async (id, roomId, { username }, socket) => {
//     const playerId = id || uuid.v4()
//     if (!playersQueue.includes(playerId)) {
//       playersQueue = [...playersQueue, playerId]
//       socket.id = playerId
//       socketServer.addPlayer(playerId, { id: playerId, socket, username, color: randomColor() })
//       socketServer.send(playerId, [{ type: actions.QUEUE_JOINED, payload: { id: playerId } }])
//     }
//     playersQueue = await redisController.checkQueue(playersQueue)
//   })
//   .on(actions.UPDATE_GAME, (id, roomId) => {
//     redisController.playerLoadedMap(id, roomId)
//   })
//   .on('ARMY_MOVE', (id, roomId, { from, to, number, patrol }) => {
//     const moveId = uuid.v1()
//     redisController.stopMove(id, roomId, { hexId: from })
//     redisController.armyMove(id, roomId, { from, to, number, patrol, moveId }, from)
//   })
