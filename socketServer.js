const _ = require('lodash')
const WebSocket = require('ws')

const players = {}

const getPlayer = id => players[id] // _.find(players, { id })

function addPlayer (id, params) {
  players[id] = Object.assign({ id }, getPlayer(id) || {}, params)
  // const player = getPlayer(id) || {}
  // players = [...players.filter(p => p.id !== id), Object.assign({ id }, player, params)]
}

function emit (client) {
  return async (roomId, list) => {
    await client.select(2)
    const room = JSON.parse(await client.getAsync(roomId))
    const playersInRoom = room.players.map(({ id }) => getPlayer(id))
    playersInRoom.forEach(({ socket }) => {
      try {
        if (socket.readyState === 1) {
          socket.send(JSON.stringify(list))
        }
      } catch (err) {
        console.log(err)
      }
    })
  }
}

function send (playerId, data) {
  const { socket } = getPlayer(playerId) || {}
  if (socket && socket.readyState === 1) {
    socket.send(JSON.stringify(data))
  }
}

function listener (server) {
  const callbacks = {}
  const ws = new WebSocket.Server({ server })

  ws.on('connection', (socket) => {
    socket.on('message', (message) => {
      const { id, roomId, type, payload } = JSON.parse(message)
      callbacks[type](id, roomId, payload, socket)
    })

    socket.on('close', () => {
      // players = players.filter(player => player.id !== newPlayerId)
    })
  })

  return {
    on: function (type, callback) { // eslint-disable-line
      callbacks[type] = callback
      return this
    }
  }
}

module.exports = client => ({
  getPlayer,
  listener,
  emit: emit(client),
  send,
  addPlayer
})
