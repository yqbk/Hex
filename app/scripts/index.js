import * as PIXI from 'pixi.js'

import connect from './sockets'
import { getMap } from '../api'

import Hex, { setMoved } from './classes/Hex'

let app
let container

let dragging = false

const createMap = () => getMap().then(({ data }) => Object.keys(data).reduce((acc, key) => ({
  ...acc,
  [key]: new Hex(data[key])
}), {}))

export default function init () {
  const map = document.getElementById('map')
  const WIDTH = window.innerWidth
  const HEIGHT = window.innerHeight

  app = new PIXI.Application(WIDTH, HEIGHT, {
    transparent: true,
    antialias: true,
    autoResize: true,
    resolution: window.devicePixelRatio || 1
  })
  map.appendChild(app.view)

  container = new PIXI.Container()
  container.scale.x = 0.7
  container.scale.y = 0.7
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

  createMap()
    .then((grid) => {
      Object.keys(grid).forEach((key) => {
        grid[key].render(container, grid)
      })

      connect()
        .register('PLAYER_REGISTERED', ({ hexId, player }) => {
          grid[hexId].changeOwner(player)
        })
        .register('CHANGE_HEX_ARMY_VALUE', ({ player, hexId, armyValue, moveId }) => {
          grid[hexId].changeArmyValue(armyValue, { player, moveId })
        })
    })
}
