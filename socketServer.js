const WebSocket = require('ws')

let players = {}
let rooms = {}

const getPlayer = id => players[id]
const getRoom = id => rooms[id]

function addPlayer (id, params) {
  players[id] = Object.assign({ id }, getPlayer(id) || {}, params)
}

function addRoom (id, params) {
  rooms[id] = Object.assign({ id }, getRoom(id) || {}, params)
}

function emit (roomId, list) {
  const room = getRoom(roomId)
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

function send (playerId, data) {
  const { socket } = getPlayer(playerId) || {}
  if (socket && socket.readyState === 1) {
    socket.send(JSON.stringify(data))
  }
}

function listener (server, onClose) {
  const callbacks = {}
  const ws = new WebSocket.Server({ server })

  ws.on('connection', (socket) => {
    socket.on('message', (message) => {
      const { id, roomId, type, payload } = JSON.parse(message)
      callbacks[type](id, roomId, payload, socket)
    })

    socket.on('close', () => onClose(socket))
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
  addPlayer,
  getRoom,
  addRoom,
  getRooms: () => rooms,
  getPlayers: () => players,
  setRooms: (newRooms) => { rooms = newRooms },
  setPlayers: (newPlayers) => { players = newPlayers },
}
