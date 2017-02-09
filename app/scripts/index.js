// import _ from 'lodash'
import * as PIXI from 'pixi.js'

import connect from './sockets'
import { getMap } from '../api'

import Hex, { setMoved } from './classes/Hex'

let app
let container

const mapWidth = 15
const mapHeight = 15

let dragging = false

function createMap (width, height, x) {
  return getMap()
    .then(map => map.data.map(({ id, ...rest }) => new Hex({
      id,
      x: ((id % mapWidth) * x) + ((id % (2 * mapWidth)) >= mapWidth ? x / 2 : 0),
      y: (x - 10) * Math.floor(id / mapWidth),
      ...rest
    })))
}

export default function init () {
  const map = document.getElementById('map') // eslint-disable-line
  const WIDTH = window.innerWidth // eslint-disable-line
  const HEIGHT = window.innerHeight // eslint-disable-line

  app = new PIXI.Application(WIDTH, HEIGHT, {
    transparent: true,
    antialias: true,
    autoResize: true,
    resolution: window.devicePixelRatio || 1 // eslint-disable-line
  })
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

  createMap(mapWidth, mapHeight, 85)
    .then((grid) => {
      grid.forEach((el) => {
        el.render(container, grid)
      })

      connect()
        .register('PLAYER_REGISTERED', () => {})
        .register('SPAWN_CASTLE', ({ hexId, playerId }) => {
          grid[hexId].setCastle()
          grid[hexId].changeOwner(playerId)
        })
        .register('SPAWN_ARMY', ({ hexId, playerId, armyValue }) => {
          grid[hexId].changeArmyValue(armyValue)
          grid[hexId].changeOwner(playerId)
        })
    })
}
