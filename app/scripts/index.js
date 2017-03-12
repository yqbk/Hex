import * as PIXI from 'pixi.js'

import listener, { getMap } from './sockets'
import store from '../store'
import { addToQueue } from '../actions'
import { GET_MAP } from './actions'

import Hex, { getSelectedHexIds } from './classes/Hex'
import me from './classes/Player'

let app
let container

let dragging = false

const controlPadding = 30
let distanceX = 0
let distanceY = 0

let interval

const WIDTH = window.innerWidth
const HEIGHT = window.innerHeight

const isInside = ({ x, y }, { startX, startY, endX, endY }, scale) => (
  Math.min(startX, endX) <= scale * x &&
  Math.max(startX, endX) >= scale * x &&
  Math.min(startY, endY) <= scale * y &&
  Math.max(startY, endY) >= scale * y
)

export function preload () {
  return new Promise((resolve) => {
    PIXI.loader.reset()
    PIXI.loader
      .add('army', 'images/army.png')
      .add('battle', 'images/battle.png')
      .add('border', 'images/border.png')
      .add('castle', 'images/castle.svg')
      .add('grass', 'images/grass.png')
      .add('sand', 'images/sand.png')
      .add('trees', 'images/trees.png')
      .add('water', 'images/water.png')
      .once('complete', () => {
        resolve()
      })
      .load()
  })
}

function rotate (sX, sY, angle, inX, inY) {
  return {
    x: (((sX - inX) * Math.cos(angle)) - ((sY - inY) * Math.sin(angle))) + inX,
    y: (((sX - inX) * Math.sin(angle)) + ((sY - inY) * Math.cos(angle))) + inY
  }
}

function scrollScreen (e) {
  const { clientX, clientY } = e
  const angleRad = Math.atan((clientY - (HEIGHT / 2)) / (clientX - (WIDTH / 2)))
  const angle = ((180 / Math.PI) * angleRad) + 90 + (clientX < WIDTH / 2 ? 180 : 0)
  if (WIDTH - clientX <= controlPadding || clientX < controlPadding ||
    HEIGHT - clientY <= controlPadding || clientY <= controlPadding) {
    const { inX, inY } = { inX: 0, inY: 0 }
    const { sX, sY } = { sX: 0, sY: -20 }
    const { x, y } = rotate(sX, sY, angle * (Math.PI / 180), inX, inY)
    distanceX = x
    distanceY = y
  } else {
    distanceX = 0
    distanceY = 0
  }
}

export default function init (spawnPosition, onLoad) {
  const map = document.getElementById('map')

  app = new PIXI.Application(WIDTH, HEIGHT, {
    transparent: true,
    antialias: true
    // autoResize: true,
    // resolution: window.devicePixelRatio || 1
  })
  map.appendChild(app.view)

  const scale = 0.7

  container = new PIXI.Container()
  container.scale.x = scale
  container.scale.y = scale
  container.interactive = true

  const graphics = new PIXI.Graphics()
  graphics.displayGroup = new PIXI.DisplayGroup(100)
  let startX
  let startY

  app.stage.displayList = new PIXI.DisplayList()

  app.stage.addChild(container)
  app.stage.addChild(graphics)

  let grid = {}

  container.mousedown = (e) => {
    dragging = true
    const { data: { global: { x, y } = { x: 0, y: 0 } } = {} } = e
    startX = x
    startY = y
  }

  container.mouseup = () => {
    dragging = false
    graphics.clear()
  }

  container.mousemove = (e) => {
    if (dragging) {
      const { data: { global: { x, y } = { x: 0, y: 0 } } = {} } = e
      graphics.clear()
      graphics.lineStyle(2, 0x00CC00, 0.5)
      graphics.beginFill(0x33FF33, 0.2)
      graphics.drawRect(startX, startY, x - startX, y - startY)

      if (Math.abs(startX - x) + Math.abs(startY - y) > 2) {
        getSelectedHexIds().forEach((id) => {
          grid[id].deselect()
        })

        me.ownedHexIds.forEach((id) => {
          if (isInside(grid[id], {
              startX: startX - container.x,
              startY: startY - container.y,
              endX: x - container.x,
              endY: y - container.y
          }, scale)) {
            grid[id].select()
          }
        })
      }
    }
  }

  interval = setInterval(() => {
    if (distanceX || distanceY) {
      container.x -= distanceX
      container.y -= distanceY
      container.x = -container.x + WIDTH > 1190 * scale ? -((1190 * scale) - WIDTH) : container.x
      container.y = -container.y + HEIGHT > 1050 * scale ? -((1050 * scale) - HEIGHT) : container.y
      container.x = container.x > 0 ? 0 : container.x
      container.y = container.y > 0 ? 0 : container.y
    }
  }, 33)

  window.addEventListener('mousemove', scrollScreen)

  listener()
    .on(GET_MAP, ({ map: gridMap }) => {
      grid = Object.keys(gridMap).filter(key => gridMap[key]).reduce((acc, key) => ({
        ...acc,
        [key]: new Hex(gridMap[key])
      }), {})

      Object.keys(grid)
        .forEach((key) => {
          grid[key].render(container, grid)
        })

      setTimeout(onLoad, Math.floor(Math.random() * 2000) + 2000)
    })
    .on('ERROR_MESSAGE', ({ message }) => {
      store.dispatch(addToQueue(message))
    })
    .on('CHANGE_HEX_ARMY_VALUE', ({ player, hexId, armyValue, moveId, from }) => {
      if (grid[hexId]) {
        grid[hexId].changeArmyValue(armyValue, { player, moveId, from })
      }
    })
    .on('SET_BATTLE', ({ attackerId, defenderId, state }) => {
      if (grid[attackerId]) {
        grid[attackerId].setBattle(defenderId, state)
      }
    })
    .on('GET_DESTINATION', ({ hexId, destination }) => {
      grid[hexId].destination = destination
      destination.forEach((id) => {
        grid[id].hex.tint = 0x99CCFF
        grid[id].shadow.tint = 0x99CCFF
      })
    })
    .on('CLEAR_DESTINATION', ({ hexId, destination }) => {
      destination.forEach((id) => {
        grid[id].hex.tint = 0xFFFFFF
        grid[id].shadow.tint = 0x898989
      })
      grid[hexId].destination = []
    })

  getMap()
}

export function reset () {
  listener().reset()
  window.clearInterval(interval)
}

export function destroyGame () {
  container.destroy(true)
  me.defaults()
}
