import { QUEUE_JOINED, MAP_LOADED, GET_MAP } from './actions'

const protocol = (window.location.protocol === 'https:') ? 'wss:' : 'ws:'
const ws = new WebSocket(`${protocol}//${location.host}`, 'echo-protocol')

ws.onopen = () => {}
ws.onclose = () => {}

let callbacks = {}

export default function listener () {
  ws.onmessage = (evt) => {
    const buffer = JSON.parse(evt.data)
    buffer.forEach(action => (callbacks[action.type] ? callbacks[action.type](action.payload) : null))
  }

  return {
    on: function (type, callback) { // eslint-disable-line
      callbacks[type] = callback
      return this
    },
    reset: function () { // eslint-disable-line
      callbacks = {}
      return this
    }
  }
}

function createRequest (type, payload) {
  return JSON.stringify({ id: sessionStorage.getItem('id'), roomId: sessionStorage.getItem('roomId'), type, payload })
}

export function getMap () {
  ws.send(createRequest(GET_MAP))
}

export function register (name, hexId) {
  ws.send(createRequest('REGISTER', { name, hexId }))
}

export function armyMove (patrol, from, to, number) {
  ws.send(createRequest('ARMY_MOVE', { from, to, number, patrol }))
}

export function joinQueue (username) {
  ws.send(createRequest(QUEUE_JOINED, { username }))
}

export function mapLoaded (roomId) {
  ws.send(createRequest(MAP_LOADED, { roomId }))
}
