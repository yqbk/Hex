import _ from 'lodash'
import * as PIXI from 'pixi.js'

let app
let grid
let container

let dragging = false

class Hex {
  constructor (x, y, scale = 0.5) {
    this.type = 'grass'

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

    // center the water's anchor point
    this.hex.anchor.set(0.5)
    this.hex.scale.set(scale)
    this.hex.x = x
    this.hex.y = y

    this.selected = false
    this.hex.click = () => {
      this.selected = !this.selected
      this.hex.tint = this.selected ? 0x00FF00 : 0xFFFFFF
    }
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
    ..._.range(1, width + 1).map(id => new Hex(id * x + (curr % 2 === 0 ? 0 : x / 2), 100 + curr * (x - 10)))
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

  container.interactive = true
  container.mousedown = () => {
    dragging = true
  }
  container.mouseup = () => {
    dragging = false
  }
  container.mousemove = (e) => {
    if (dragging) {
      container.x += e.data.originalEvent.movementX
      container.y += e.data.originalEvent.movementY
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

  grid[5,15,25,34].type = 'water'
  grid.forEach(el => el.render())

  grid[5].addCastle()
}
