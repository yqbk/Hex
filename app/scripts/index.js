import _ from 'lodash'
import * as PIXI from 'pixi.js'

let app
let grid
let container

let dragging = false
let moved = false

class Hex {
  constructor (x, y, scale = 0.5, type = 'grass', id = 1) {

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

    this.selected = false
    this.hex.click = () => {
      this.selected = !this.selected
      this.hex.tint = this.selected ? 0x00FF00 : 0xFFFFFF
      console.log(this.id)
    }
  }

  changeType (type) {
    this.hex.destroy()
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

    container.addChild(this.castle)
  }

  render () {
    container.addChild(this.hex)
  }
}

function createMap (width, height, x) {
  const line = _.range(0, height).reduce((acc, curr) => [
    ...acc,
    ..._.range(1, width + 1).map(id => new Hex(id * x + (curr % 2 === 0 ? 0 : x / 2), 100 + curr * (x - 10), 0.5, 'grass', curr*width + id))
  ], [])

  return line
}

export function init () {
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
      if (Math.abs(e.data.originalEvent.movementX) > 5 || Math.abs(e.data.originalEvent.movementY) > 5) {
        moved = true
      }
    }
  }
  let counter = 1
  document.addEventListener('mousewheel', (e) => {
    counter += e.wheelDelta < 0 ? -0.05 : 0.05
    counter = (counter >= 0.5 && counter <= 1.5 && counter) || (counter < 0.5 && 0.5) || (counter > 1.5 && 1.5)
    container.scale.x = counter
    container.scale.y = counter
  })

  app.stage.addChild(container)

  // grid = _.range(1, 10 + 1).map(id => new Hex(100 * id, 300))

  grid = createMap(15, 15, 85)

  const waterTable = [6,21,22,37,38,39,52,53,54,68,69,70,82,83,84,98,113,99,129,114,129,130,145,160,174,190,191,175,205,206,220,221,222]
  const sandTable = [139,154,153,168,184,185,186,200,169,170,155,215,214,199,198,213,212,210,211,197,196,183,182,181,167,166,167,195,180,165]

  grid.forEach( (element, id) => {
    if (waterTable.includes(id)) {
      element.changeType('water')
    } else if (sandTable.includes(id)) {
      element.changeType('sand')
    }
  })

  grid.forEach(el => el.render())

  grid[36].addCastle()
}
