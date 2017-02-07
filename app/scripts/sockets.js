export default function connect () {
  const ws = new WebSocket('ws://localhost:5000', 'echo-protocol') // eslint-disable-line
  const callbacks = {}

  ws.onopen = () => {}

  ws.onmessage = (evt) => {
    const buffer = JSON.parse(evt.data)
    buffer.forEach(action => (callbacks[action.type] ? callbacks[action.type](action.payload) : null))
  }

  ws.onclose = () => {}

  return {
    register: function (type, func) { // eslint-disable-line
      callbacks[type] = func
      return this
    }
  }
}
