const xs = require('xstream').default
const WebSocket = require('ws')
const redis = require('redis')
const bluebird = require('bluebird')
const mapFile = require('../static/map.json')

const utils = require('./utils')
const actions = require('../app/scripts/actions')

bluebird.promisifyAll(redis.RedisClient.prototype)
bluebird.promisifyAll(redis.Multi.prototype)
const client = redis.createClient(process.env.REDIS_URL)

client.on('connect', async () => {
  await client.flushall()
  console.log('Redis databases cleared')
})

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
    send: async (message) => {
      try {
        const [status, data] = message.playersIds
          ? ['OK', message.playersIds]
          : await client.multi().select(1).get(message.roomId).execAsync()

        if (status !== 'OK') {
          throw new Error('Error while sending message')
        }

        const sockets = data.players || data

        ws.clients.forEach((socket) => {
          if (sockets.includes(socket.id)) {
            // console.log(JSON.stringify(message.data))
            socket.send(JSON.stringify(message.data))
          }
        })
      } catch (err) {
        console.log(err.message)
      }
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

        const [status] = await client.multi()
          .select(0)
          .set(player.id, JSON.stringify(player))
          .execAsync()

        if (status === 'OK') {
          listener.next({ type: actions.ADD_PLAYERS, payload: { type: actions.ADD_PLAYERS, ids: [player.id] } })
          listener.next({
            type: actions.SEND,
            payload: {
              playersIds: [player.id],
              data: {
                type: actions.QUEUE_JOINED,
                payload: { id: player.id }
              }
            }
          })
        }
      },
      error: () => {},
      complete: () => {}
    })
  },
  stop: () => {}
})

const makeFindRoomDriver = () => findRoom$ => xs.create({
  start: (listener) => {
    findRoom$.addListener({
      next: async (playersIds) => {
        const db = await utils.getAvailableRoom(client)
        if (db) {
          const data = await Promise.all(playersIds.map(id => client.multi().select(0).get(id).execAsync()))
          const players = data.reduce((acc, curr) => (
            curr[0] === 'OK' && curr[1]
              ? [...acc, ...(curr[0] === 'OK' ? [JSON.parse(curr[1])] : [])]
              : acc
          ), [])

          if (Object.keys(players).length === playersIds.length) {
            listener.next({
              type: actions.REMOVE_PLAYERS,
              payload: { type: actions.REMOVE_PLAYERS, number: players.length }
            })
            listener.next({ type: actions.START_GAME, payload: { db, players } })
          }
        }
      }
    })
  },
  stop: () => {}
})

const makeStartGameDriver = () => playersQueue$ => xs.create({
  start: (listener) => {
    playersQueue$.addListener({
      next: async (room) => {
        const playersIds = Object.keys(room.players)
        const [status] = await client.multi().select(1).set(room.id, JSON.stringify(room)).execAsync()

        if (status === 'OK') {
          console.log(`Room ${room.id} created`)

          await Promise.all(mapFile.map(async (hex) => {
            await client.multi().select(room.db).set(hex.id, JSON.stringify(hex)).execAsync()
          }))
          console.log('Map inserted into redis')

          listener.next({
            type: actions.SEND,
            payload: { playersIds, data: { type: actions.START_COUNTDOWN } }
          })

          await new Promise(resolve => setTimeout(resolve, 5000))

          listener.next({
            type: actions.SEND,
            payload: { playersIds, data: { type: actions.LOADING_SCREEN, payload: { room } } }
          })
          console.log('Game started')
        }
      },
      error: () => {},
      complete: () => {}
    })
  },
  stop: () => {}
})

module.exports = {
  makeWSDriver,
  makeJoinQueueDriver,
  makeFindRoomDriver,
  makeStartGameDriver
}
