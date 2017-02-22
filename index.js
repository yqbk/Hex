const express = require('express')
const http = require('http')
const history = require('connect-history-api-fallback')
const config = require('./webpack.config')
const webpack = require('webpack')
const uuid = require('uuid')
const redisController = require('./redisController')
const socketServer = require('./socketServer')

const port = process.env.PORT || 5000
const compiler = webpack(config)
const app = express()
const server = http.createServer(app)

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

socketServer.connect(server)
  .register('REGISTER', (id, { name, hexId }, send) => {
    redisController.register(id, { name, hexId }, send)
  })
  .register('ARMY_MOVE', (id, { from, to, number, patrol }, send) => {
    const moveId = uuid.v1()
    redisController.stopMove(id, { hexId: from }, send)
    redisController.armyMove(id, { from, to, number, patrol, moveId }, from, send)
  })
  .register('STOP_MOVE', (id, { hexId }, send) => {
    // redisController.stopMove(id, { hexId }, send)
  })
