import { QUEUE_JOINED } from './actions'

const protocol = (window.location.protocol === 'https:') ? 'wss:' : 'ws:'
const ws = new WebSocket(`${protocol}//${location.host}`, 'echo-protocol')

ws.onopen = () => {}
ws.onclose = () => {}

const callbacks = {}

export default function listener () {
  ws.onmessage = (evt) => {
    const buffer = JSON.parse(evt.data)
    buffer.forEach(action => (callbacks[action.type] ? callbacks[action.type](action.payload) : null))
  }

  return {
    on: function (type, callback) { // eslint-disable-line
      callbacks[type] = callback
      return this
    }
  }
}

function createRequest (type, payload) {
  return JSON.stringify({ id: sessionStorage.getItem('id'), type, payload })
}

// ------ GAME -------
export function register (name, hexId) {
  ws.send(createRequest('REGISTER', { name, hexId }))
}

export function armyMove (patrol, from, to, number) {
  ws.send(createRequest('ARMY_MOVE', { from, to, number, patrol }))
}

// ------ MENU -------
export function joinQueue () {
  ws.send(createRequest(QUEUE_JOINED))
}
