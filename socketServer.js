const _ = require('lodash')
const WebSocket = require('ws')

let players = []

const getPlayer = id => _.find(players, { id })

function addPlayer (id, socket, params) {
  players = [...players.filter(p => p.id !== id), { id, socket, ...params }]
}

function emit (list) {
  players.forEach(({ socket }) => {
    try {
      if (socket.readyState === 1) {
        socket.send(JSON.stringify(list))
      }
    } catch (err) {
      console.log(err)
    }
  })
}

function send (playerId, data) {
  const { socket } = _.find(players, { id: playerId }) || {}
  if (socket && socket.readyState === 1) {
    socket.send(JSON.stringify(data))
  }
}

function listener (server) {
  const callbacks = {}
  const ws = new WebSocket.Server({ server })

  ws.on('connection', (socket) => {
    socket.on('message', (message) => {
      const { id, type, payload } = JSON.parse(message)
      callbacks[type](id, payload, socket)
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

module.exports = {
  getPlayer,
  listener,
  emit,
  send,
  addPlayer
}
