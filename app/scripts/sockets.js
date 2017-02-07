export function connect () {
  const ws = new WebSocket('ws://localhost:5000', 'echo-protocol')

  ws.onopen = function () {
    ws.send(JSON.stringify({ a: 5 }))
    console.log('Message is sent...')
  }

  ws.onmessage = function (evt) {
    const receivedMsg = evt.data
    console.log('Message is received...', receivedMsg)
  }

  ws.onclose = function () {
    console.log('Connection is closed...')
  }
}

