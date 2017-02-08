import _ from 'lodash'
import * as PIXI from 'pixi.js'

import connect from './sockets'

import Hex, { setMoved } from './classes/Hex'

let app
let grid
let container

const mapWidth = 15
const mapHeight = 15

let dragging = false

function createMap (width, height, x) {
  const line = _.range(0, height).reduce((acc, curr) => [
    ...acc,
    ..._.range(1, width + 1).map(id => new Hex(
        (id * x) + (curr % 2 === 0 ? 0 : x / 2),
        100 + (curr * (x - 10)),
        0.5,
        'grass',
        (curr * width) + id - 1)
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
  container.scale.x = 0.6
  container.scale.y = 0.6
  container.interactive = true
  container.mousedown = () => {
    dragging = true
    setMoved(false)
  }
  container.mouseup = () => {
    dragging = false
  }
  container.mousemove = (e) => {
    if (dragging) {
      container.x += e.data.originalEvent.movementX
      container.y += e.data.originalEvent.movementY
      if (Math.abs(e.data.originalEvent.movementX) > 1 || Math.abs(e.data.originalEvent.movementY) > 1) {
        setMoved(true)
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

  grid = createMap(mapWidth, mapHeight, 85)

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

  grid[36].addCastle(container)
  grid[2].addArmy(container)

  connect()
    .register('PLAYER_REGISTERED', (user) => {
      console.log(user) // eslint-disable-line
    })
    .register('SPAWN_PLAYER', (hex) => {
      const { id } = hex
      grid[id - 2].addArmy(container)
      grid[id - 1].addCastle(container)
    })
}
