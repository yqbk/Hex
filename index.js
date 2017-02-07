const express = require('express')
const http = require('http')
const history = require('connect-history-api-fallback')
const config = require('./webpack.config')
const webpack = require('webpack')
const WebSocketServer = require('websocket').server
const redis = require('redis')
const bluebird = require('bluebird')

bluebird.promisifyAll(redis.RedisClient.prototype)
bluebird.promisifyAll(redis.Multi.prototype)
const client = redis.createClient()

const port = process.env.PORT || 5000
const compiler = webpack(config)
const app = express()
const server = http.createServer(app)

app.get('/hello', async (req, res) => {
  const data = await client.getAsync('string key')
  res.send(data)
})

app.get('/register', async (req, res) => {
  const data = await client.getAsync('string key')
  res.send(data)
})

// client.set('string key', 'string val', () => {
//   client.getAsync('string key').then((res) => {
//     console.log(res)
//   })
// })

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

  console.log(`Listening on port ${port}`)  // eslint-disable-line
})

const wsServer = new WebSocketServer({
  httpServer: server,
  autoAcceptConnections: false
})

function originIsAllowed (origin) {
  return true
}

wsServer.on('request', (request) => {
  if (!originIsAllowed(request.origin)) {
    // Make sure we only accept requests from an allowed origin
    request.reject()
    console.log((new Date()) + ' Connection from origin ' + request.origin + ' rejected.')
    return
  }

  const connection = request.accept('echo-protocol', request.origin)
  console.log(`${new Date()} Connection accepted.`)

  connection.on('message', (message) => {
    console.log(message)
    if (message.type === 'utf8') {
      console.log(`Received Message: ${message.utf8Data}`)
      connection.sendUTF(message.utf8Data)
    }
  })

  connection.on('close', (reasonCode, description) => {
    console.log(`${new Date()} Peer ${connection.remoteAddress} disconnected.`)
  })
})
