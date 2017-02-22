const WebSocket = require('ws')
const uuid = require('uuid')

let players = []

function emit (list) {
  players.forEach(({ socket }) => {
    try {
      socket.send(JSON.stringify(list))
    } catch (err) {
      console.log(err)
    }
  })
}

function connect (server) {
  const callbacks = {}
  const ws = new WebSocket.Server({ server })

  ws.on('connection', (socket) => {
    const newPlayerId = uuid.v4()
    players.push({ id: newPlayerId, socket })

    socket.on('message', (message) => {
      const { id, type, payload } = JSON.parse(message)
      callbacks[type](id, payload, (list) => {
        try {
          if (socket.readyState === 1) {
            socket.send(JSON.stringify(list))
          }
        } catch (err) {
          console.error(err)
        }
      })
    })

    socket.on('close', () => {
      players = players.filter(player => player.id !== newPlayerId)
    })
  })

  return {
    register: function (type, callback) { // eslint-disable-line
      callbacks[type] = callback
      return this
    }
  }
}

module.exports = {
  connect,
  emit
}
