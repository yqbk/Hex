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
  const bufferClose = []
  ws.on('connection', (socket) => {
    socket.on('message', (message) => {
      const { type, payload } = JSON.parse(message)
      console.log(type)
      buffer.forEach(func => func({ type, payload: { type, socket, ...payload } }))
    })

    socket.on('close', () => {
      bufferClose.forEach(func => func(socket.id))
    })
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
            socket.send(JSON.stringify(message.data))
          }
        })
      } catch (err) {
        console.log(err.message)
      }
    },
    onDataReceive: (func) => {
      buffer.push(func)
    },
    onClose: (func) => {
      bufferClose.push(func)
    }
  }
}

const makeWSDriver = (server) => {
  const ws = new WebSocket.Server({ server })
  const socket = connection(ws)
  console.log('WebSocket Server running')

  return (outgoing$) => {
    outgoing$.addListener({
      next: ({ payload }) => {
        socket.send(payload)
      },
      error: () => {},
      complete: () => {}
    })

    return xs.create({
      start: (listener) => {
        socket.onDataReceive((data) => {
          listener.next(data)
        })
        socket.onClose((id) => {
          if (id) {
            listener.next({ type: actions.PLAYER_LEFT, payload: { id } })
          }
        })
      },
      stop: () => {}
    })
  }
}

const makePlayerLeftDriver = () => playerLeft$ => xs.create({
  start: (listener) => {
    playerLeft$.addListener({
      next: ({ payload: { id } }) => {
        listener.next({ type: actions.REMOVE_PLAYERS, payload: { type: actions.REMOVE_PLAYERS, ids: [id] } })
      },
      error: () => {},
      complete: () => {}
    })
  },
  stop: () => {}
})

const makeGetMapDriver = () => getMap$ => xs.create({
  start: (listener) => {
    getMap$.addListener({
      next: async ({ id, room: { db } }) => {
        try {
          const [status, mapKeys] = await client.multi().select(db).keys('*').execAsync()
          if (status === 'OK') {
            const map = {}
            for (const key in mapKeys) { // eslint-disable-line
              const [s, v] = await client.multi().select(db).get(key).execAsync() // eslint-disable-line
              if (s === 'OK') {
                map[key] = JSON.parse(v)
              }
            }
            listener.next({
              type: actions.SEND,
              payload: {
                playersIds: [id],
                data: {
                  type: actions.GET_MAP,
                  payload: { map }
                }
              }
            })
          }
        } catch (err) {
          console.error(err)
        }
      },
      error: () => {},
      complete: () => {}
    })
  },
  stop: () => {}
})

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
          const players = (await Promise.all(playersIds.map(id => client.multi().select(0).get(id).execAsync())))
            .reduce((acc, curr) => (
              curr[0] === 'OK' && curr[1] ? [...acc, JSON.parse(curr[1])] : acc
            ), [])

          if (players.length === playersIds.length) {
            listener.next({ type: actions.REMOVE_PLAYERS, payload: { type: actions.REMOVE_PLAYERS, ids: playersIds } })
            listener.next({ type: actions.START_GAME, payload: { db, players } })
          }
        }
      }
    })
  },
  stop: () => {}
})

const makeSetRoomDriver = () => setRoom$ => xs.create({
  start: (listener) => {
    setRoom$.addListener({
      next: async ({ type, payload }) => {
        const { room } = payload
        const [status] = await client.multi().select(1).set(room.id, JSON.stringify(room)).execAsync()
        if (status === 'OK') {
          console.log(`Room ${room.id} updated`)
          listener.next({ type, payload: { ...payload, room } })
        }
      }
    })
  },
  stop: () => {}
})

const makeGetRoomDriver = () => getRoom$ => xs.create({
  start: (listener) => {
    getRoom$.addListener({
      next: async ({ type, payload }) => {
        const { roomId } = payload
        const [status, room] = await client.multi().select(1).get(roomId).execAsync()
        if (status === 'OK') {
          listener.next({ type, payload: { ...payload, room: JSON.parse(room) } })
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
      },
      error: () => {},
      complete: () => {}
    })
  },
  stop: () => {}
})

module.exports = {
  makeWSDriver,
  makePlayerLeftDriver,
  makeJoinQueueDriver,
  makeFindRoomDriver,
  makeStartGameDriver,
  makeSetRoomDriver,
  makeGetMapDriver,
  makeGetRoomDriver
}
