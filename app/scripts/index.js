import _ from 'lodash'
import * as PIXI from 'pixi.js'

import { register } from '../api'
import connect from './sockets'

import Hex from './classes/Hex'
import Player from './classes/Player'


let app
let grid
let container

const WIDTH = 15
const HEIGHT = 15

let dragging = false
let moved = false
let lastSelected

const me = new Player('john')

function createMap (width, height, x) {
  const line = _.range(0, height).reduce((acc, curr) => [
    ...acc,
    ..._.range(1, width + 1).map(id => new Hex(
        (id * x) + (curr % 2 === 0 ? 0 : x / 2),
        100 + (curr * (x - 10)),
        0.5,
        'grass',
        (curr * width) + id)
    )
  ], [])

  return line
}

export default function init () {
  const map = document.getElementById('map') // eslint-disable-line
  const WIDTH = window.innerWidth // eslint-disable-line
  const HEIGHT = window.innerHeight // eslint-disable-line

  app = new PIXI.Application(WIDTH, HEIGHT, { transparent: true, antialias: true })
  map.appendChild(app.view)

  container = new PIXI.Container()
  // container.pivot.x = 500
  // container.pivot.y = 500

  container.interactive = true
  container.mousedown = () => {
    dragging = true
    moved = false
  }
  container.mouseup = () => {
    dragging = false
  }
  container.mousemove = (e) => {
    if (dragging) {
      container.x += e.data.originalEvent.movementX
      container.y += e.data.originalEvent.movementY
      if (Math.abs(e.data.originalEvent.movementX) > 1 || Math.abs(e.data.originalEvent.movementY) > 1) {
        moved = true
      }
    }
  }
  // let counter = 1
  // document.addEventListener('mousewheel', (e) => { // eslint-disable-line
  //   counter += e.wheelDelta < 0 ? -0.05 : 0.05
  //   counter = (counter >= 0.5 && counter <= 1.5 && counter) || (counter < 0.5 && 0.5) || (counter > 1.5 && 1.5)
  //   container.scale.x = counter
  //   container.scale.y = counter
  // })

  app.stage.addChild(container)

  grid = createMap(15, 15, 85)

  const waterTable = [6, 21, 22, 37, 38, 39, 52, 53, 54, 68, 69, 70, 82, 83, 84, 98, 113, 99, 129, 114, 129, 130, 145,
    160, 174, 190, 191, 175, 205, 206, 220, 221, 222]
  const sandTable = [139, 154, 153, 168, 184, 185, 186, 200, 169, 170, 155, 215, 214, 199, 198, 213, 212, 210, 211, 197,
    196, 183, 182, 181, 167, 166, 167, 195, 180, 165]

  grid.forEach((element, id) => {
    if (waterTable.includes(id)) {
      element.changeType('water')
    } else if (sandTable.includes(id)) {
      element.changeType('sand')
    }
  })

  grid.forEach((el) => {
    el.addIdToImage(container)
    el.render(container)
  })

  grid[36].addCastle(container, moved)

  grid[2].addArmy(container, moved)

  // funkcja connect służy do łączenie się przez WebSockety do serwera
  // serwer aktualnie wysyła co 1s (docelowo będzie 100ms) zmiany jakie zdarzyły się w ostatniej sekundzie
  // za pomocą funkcji 'register' rejestrujemy funkcje jakie mają się wykonać dla danej akcji
  connect()
    .register('PLAYER_REGISTERED', (user) => {
      console.log(user)
    })
    .register('SPAWN_PLAYER', (hex) => {
      const { id } = hex
      // nowy gracz dostaje zamek w miejscu, które sobie wybrał

      console.log('spawn army')
      grid[id - 2].addArmy(container, moved)

      grid[id - 1].addCastle(container, moved)
    })
}
