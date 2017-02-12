const ws = new WebSocket('ws://localhost:5000', 'echo-protocol') // eslint-disable-line

ws.onopen = () => {}
ws.onclose = () => {}

export default function connect () {
  const callbacks = {}

  ws.onmessage = (evt) => {
    const buffer = JSON.parse(evt.data)
    buffer.forEach(action => (callbacks[action.type] ? callbacks[action.type](action.payload) : null))
  }

  return {
    register: function (type, callback) { // eslint-disable-line
      callbacks[type] = callback
      return this
    }
  }
}

function createRequest (type, payload) {
  return JSON.stringify({ id: sessionStorage.getItem('id'), type, payload }) // eslint-disable-line
}

export function armyMove (from, to, number) {


  ws.send(createRequest('ARMY_MOVE', { from, to, number }))
}
