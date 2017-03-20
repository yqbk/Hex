const xs = require('xstream').default
const WebSocket = require('ws')
const redis = require('redis')
const bluebird = require('bluebird')

const actions = require('../app/scripts/actions')

bluebird.promisifyAll(redis.RedisClient.prototype)
bluebird.promisifyAll(redis.Multi.prototype)
const client = redis.createClient(process.env.REDIS_URL)

const connection = (ws) => {
  const buffer = []
  ws.on('connection', (socket) => {
    socket.on('message', (message) => {
      const { id, roomId, type, payload } = JSON.parse(message)
      buffer.forEach(func => func({ type, id, roomId, payload, socket }))
    })

    // socket.on('close', () => onClose(socket))
  })

  return {
    send: (message) => {
      console.log('Message sent', message)
    },
    onDataReceive: (func) => {
      buffer.push(func)
    }
  }
}

const makeWSDriver = (server) => {
  const ws = new WebSocket.Server({ server })
  const socket = connection(ws)
  console.log('WebSocket Server running')

  return (outgoing$) => {
    outgoing$.addListener({
      next: (message) => {
        socket.send(message)
      },
      error: () => {},
      complete: () => {}
    })

    return xs.create({
      start: (listener) => {
        socket.onDataReceive((data) => {
          listener.next(data)
        })
      },
      stop: () => {}
    })
  }
}

const makeJoinQueueDriver = () => joinQueue$ => xs.create({
  start: (listener) => {
    joinQueue$.addListener({
      next: async ([message, player]) => {
        const { socket } = message
        socket.id = player.id

        // await client.multi()
        //   .select(0)
        //   .set(player.id, JSON.stringify(player))
        //   .exec()

        listener.next({ type: actions.ADD_PLAYERS, payload: { type: actions.ADD_PLAYERS, ids: [player.id] } })
        listener.next({ type: actions.SEND, payload: { type: actions.QUEUE_JOINED, id: player.id } })
      },
      error: () => {},
      complete: () => {}
    })
  },
  stop: () => {}
})

module.exports = {
  makeWSDriver,
  makeJoinQueueDriver
}
