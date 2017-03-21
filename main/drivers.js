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
      const { type, payload } = JSON.parse(message)
      buffer.forEach(func => func({ type, payload: { type, socket, ...payload } }))
    })

    // socket.on('close', () => onClose(socket))
  })

  return {
    send: (message) => {
      console.log('Message sent')
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
      next: async ([payload, player]) => {
        const { socket } = payload
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

const makeStartGameDriver = () => playersQueue$ => xs.create({
  start: (listener) => {
    playersQueue$.addListener({
      next: async (playersQueue) => {
        console.log(playersQueue)
        if (playersQueue.length >= 3) {
          listener.next({ type: actions.REMOVE_PLAYERS, payload: { type: actions.REMOVE_PLAYERS, number: 2 } })
          console.log('Game started')
        }
      }
    })
  },
  stop: () => {}
})

module.exports = {
  makeWSDriver,
  makeJoinQueueDriver,
  makeStartGameDriver
}
