import _ from 'lodash'
import * as PIXI from 'pixi.js'

import { register } from '../api'
import connect from './sockets'

let app
let grid
let container

const WIDTH = 15
const HEIGHT = 15

let dragging = false
let moved = false
let lastSelected

class Player {
  constructor (name) {
    this.name = name
    this.registered = false
  }

  register ({ hexId }) {
    if (!this.registered) {
      register({ name: this.name, hexId })
        .then((result) => {
          if (result) {
            this.registered = true
          }
        })
    }
  }
}

const me = new Player('john')

class Hex {
  constructor (x, y, scale = 0.5, type = 'grass', id = 1) {
    this.handleClick = this.handleClick.bind(this)

    this.x = x
    this.y = y
    this.scale = scale
    this.type = type
    this.id = id
    switch (this.type) {
      case 'grass':
        this.hex = new PIXI.Sprite(PIXI.Texture.fromImage('images/grass.png'))
        break
      case 'water':
        this.hex = new PIXI.Sprite(PIXI.Texture.fromImage('images/water.png'))
        break
      case 'sand':
        this.hex = new PIXI.Sprite(PIXI.Texture.fromImage('images/sand.png'))
        break
      default:
        this.hex = new PIXI.Sprite(PIXI.Texture.fromImage('images/grass.png'))
        break
    }

    this.hex.interactive = true

    this.hex.buttonMode = true
    this.hex.anchor.set(0.5)
    this.hex.scale.set(scale)
    this.hex.x = this.x
    this.hex.y = this.y
    this.hex.contain = ''
    this.startMarch = false

    this.selected = false
    this.hex.click = this.handleClick
  }

  addIdToImage () {
    const serializedSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><text x="64" y="100" text-anchor="middle" font-size="100">${this.id}</text></svg>`
    const SVG_SOURCE = `data:image/svg+xml,${serializedSvg}`
    const texture = PIXI.Texture.fromImage(SVG_SOURCE)
    this.number = new PIXI.Sprite(texture)

    // this.army = new PIXI.Sprite(PIXI.Texture.fromImage('images/army.svg'))
    this.number.anchor.set(0.5)
    this.number.scale.set(0.5)
    this.number.x = this.hex.x + 5
    this.number.y = this.hex.y + 5

    container.addChild(this.number)
  }

  handleClick () {
    if (!moved) {
      this.selected = !this.selected
      // this.hex.tint = this.selected ? 0x00FF00 : 0xFFFFFF
      // this.hex.filter = 'outline'
      // rejestracja gracza w serwerze
      me.register({ hexId: this.id })
    }


    if (this.hex.contain === 'army') {
      this.showRange()
      grid[this.id - 1].startMarch = true

    } else if (grid[this.id].hex.tint === 0x00FF00) {

      // const lastPos = grid[this.id]
      grid[lastSelected].destroyArmy()
      // lastPos.startMarch = false
      this.addArmy()
    } else {
      lastSelected = this.id
    }

  }

  changeType (type) {
    this.hex.destroy()
    console.log('destroy army')
    this.constructor(this.x, this.y, this.scale, type, this.id)
  }

  changePosition (moveX, moveY) {
    this.hex.x += moveX
    this.hex.y += moveY
  }

  addCastle () {
    this.castle = new PIXI.Sprite(PIXI.Texture.fromImage('images/castle.svg'))
    this.castle.anchor.set(0.5)
    this.castle.scale.set(0.1)
    this.castle.x = this.hex.x
    this.castle.y = this.hex.y

    this.castle.interactive = true
    this.castle.buttonMode = true
    this.castle.click = this.handleClick

    this.hex.contain = 'castle'

    container.addChild(this.castle)
  }

  addArmy () {
    const serializedSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><text x="64" y="100" text-anchor="middle" font-size="100">😄</text></svg>'
    const SVG_SOURCE = `data:image/svg+xml,${serializedSvg}`
    const texture = PIXI.Texture.fromImage(SVG_SOURCE)
    this.army = new PIXI.Sprite(texture)


    // this.army = new PIXI.Sprite(PIXI.Texture.fromImage('images/army.svg'))
    this.army.anchor.set(0.5)
    this.army.scale.set(0.5)
    this.army.x = this.hex.x
    this.army.y = this.hex.y


    this.army.interactive = true
    this.army.buttonMode = true
    this.army.click = this.handleClick

    this.hex.contain = 'army'

    container.addChild(this.army)
  }

  showRange () {

    const oneStepRange = (this.id % (2 * WIDTH)) >= WIDTH ?
      [this.id, this.id + 1, this.id - 1, this.id + WIDTH, this.id + WIDTH + 1, this.id - WIDTH, this.id - WIDTH + 1] :
      [this.id, this.id + 1, this.id - 1, this.id + WIDTH, this.id + WIDTH + 1, this.id - WIDTH, this.id - WIDTH + 1]

    const twoStepRange = (this.id % (2 * WIDTH)) >= WIDTH ?
      [this.id + 2, this.id - 2, this.id + WIDTH + 2, this.id + WIDTH - 1, this.id + 2 * WIDTH, this.id + 2 * WIDTH + 1, this.id + 2 * WIDTH - 1,
      this.id - WIDTH + 2, this.id - WIDTH - 1, this.id - 2 * WIDTH, this.id - 2 * WIDTH + 1, this.id - 2 * WIDTH - 1] :
      [this.id + 2, this.id - 2,
        this.id + WIDTH - 2, this.id + WIDTH - 1, this.id + 2 * WIDTH, this.id + 2 * WIDTH + 1, this.id + 2 * WIDTH - 1,
        this.id - WIDTH - 2, this.id - WIDTH - 1, this.id - 2 * WIDTH, this.id - 2 * WIDTH + 1, this.id - 2 * WIDTH - 1]

  //
    const range = oneStepRange.concat(twoStepRange)
    console.log(range)
    range.forEach((id) => {
      grid[id - 1].hex.tint = 0x00FF00
    })
  }

  destroyArmy () {
    this.army.destroy()
  }


  render () {
    container.addChild(this.hex)
  }
}

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
  let counter = 1
  document.addEventListener('mousewheel', (e) => { // eslint-disable-line
    counter += e.wheelDelta < 0 ? -0.05 : 0.05
    counter = (counter >= 0.5 && counter <= 1.5 && counter) || (counter < 0.5 && 0.5) || (counter > 1.5 && 1.5)
    container.scale.x = counter
    container.scale.y = counter
  })

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
    el.addIdToImage()
    el.render()
  })

  grid[36].addCastle()

  grid[2].addArmy()

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
      grid[id - 2].addArmy()

      grid[id - 1].addCastle()
    })
}
