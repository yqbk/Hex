import * as PIXI from 'pixi.js'

import listener from './sockets'
import { getMap } from '../api'
import store from '../store'
import { addToQueue } from '../actions'

import Hex, { me, getSelectedHexIds } from './classes/Hex'

let app
let container

let dragging = false

const createMap = () => getMap().then(({ data }) => Object.keys(data).reduce((acc, key) => ({
  ...acc,
  [key]: new Hex(data[key])
}), {}))

const isInside = ({ x, y }, { startX, startY, endX, endY }, scale) => (
  Math.min(startX, endX) <= scale * x &&
  Math.max(startX, endX) >= scale * x &&
  Math.min(startY, endY) <= scale * y &&
  Math.max(startY, endY) >= scale * y
)

export function preload () {
  return new Promise((resolve) => {
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

export default function init (spawnPosition) {
  const map = document.getElementById('map')
  const WIDTH = window.innerWidth
  const HEIGHT = window.innerHeight

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
  let startX
  let startY

  // let counter = 1
  // document.addEventListener('mousewheel', (e) => { // eslint-disable-line
  //   counter += e.wheelDelta < 0 ? -0.05 : 0.05
  //   counter = (counter >= 0.5 && counter <= 1.5 && counter) || (counter < 0.5 && 0.5) || (counter > 1.5 && 1.5)
  //   container.scale.x = counter
  //   container.scale.y = counter
  // })

  app.stage.displayList = new PIXI.DisplayList()

  app.stage.addChild(container)
  app.stage.addChild(graphics)

  createMap()
    .then((grid) => {
      Object.keys(grid).forEach((key) => {
        grid[key].render(container, grid)
      })

      console.log(spawnPosition)
      me.register(spawnPosition)

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
          // container.x += e.data.originalEvent.movementX
          // container.y += e.data.originalEvent.movementY

          if (Math.abs(startX - x) + Math.abs(startY - y) > 2) {
            getSelectedHexIds().forEach((id) => {
              grid[id].deselect()
            })

            me.ownedHexIds.forEach((id) => {
              if (isInside(grid[id], { startX, startY, endX: x, endY: y }, scale)) {
                grid[id].select()
              }
            })
          }
        }
      }

      listener()
        .on('REGISTER', ({ playerId }) => {
          sessionStorage.setItem('id', playerId)
          me.id = playerId
          me.registered = true
        })
        .on('ERROR_MESSAGE', ({ message }) => {
          store.dispatch(addToQueue(message))
        })
        .on('PLAYER_REGISTERED', ({ hexId, player }) => {
          grid[hexId].changeOwner(player)
        })
        .on('CHANGE_HEX_ARMY_VALUE', ({ player, hexId, armyValue, moveId, from }) => {
          grid[hexId].changeArmyValue(armyValue, { player, moveId, from })
        })
        .on('SET_BATTLE', ({ attackerId, defenderId, state }) => {
          grid[attackerId].setBattle(defenderId, state)
        })
        .on('GET_DESTINATION', ({ hexId, destination }) => {
          grid[hexId].destination = destination
          destination.forEach((id) => {
            grid[id].hex.tint = 0x99CCFF
          })
        })
        .on('CLEAR_DESTINATION', ({ hexId, destination }) => {
          destination.forEach((id) => {
            grid[id].hex.tint = 0xFFFFFF
          })
          grid[hexId].destination = []
        })
    })
}
