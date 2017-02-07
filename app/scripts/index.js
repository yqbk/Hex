import _ from 'lodash'
import * as PIXI from 'pixi.js'

let stage
let app
let grid

// function createMap (width, height, x) {
//   // const unit = x * Math.sqrt(3) / 2
//
//   const line = _.range(0, height).reduce((acc, curr) => [
//       ...acc,
//       ..._.range(1, width + 1).map(id => new Hex(id * (2 * unit + x) + (curr % 2 === 0 ? 0 : unit + x / 2), 2 * x + curr * (unit - 3), unit, app))
//     ], [])
//
//   return line
// }

class Hex {
  constructor (x, y, scale = 0.5) {
    this.hex = new PIXI.Sprite(PIXI.Texture.fromImage('water.png'))
    this.hex.interactive = true
    this.hex.buttonMode = true

    // center the water's anchor point
    this.hex.anchor.set(0.5)
    this.hex.scale.set(scale)
    this.hex.x = x
    this.hex.y = y

    this.hex
      .on('pointerdown', onDragStart)
      .on('pointerup', onDragEnd)
      .on('pointerupoutside', onDragEnd)
      .on('pointermove', onDragMove)
      .on('resize', onResize)

    this.app = app
    this.stage = stage

    // this.selected = false
    // this.hex.click = () => {
    //   this.selected = !this.selected
    //
    //   this.hex.clear()
    //   this.render(this.selected ? 0x00FF00 : 0x66CCFF)
    // }
  }

  changePosition (moveX, moveY) {
    this.hex.x += moveX
    this.hex.y += moveY
  }

  render () {
    app.stage.addChild(this.hex)
  }
}

// ----- hex movement

function onDragStart (event) {
  // store a reference to the data
  // the reason for this is because of multitouch
  // we want to track the movement of this particular touch
  this.data = event.data
  this.alpha = 0.5
  this.dragging = true
}

function onResize (event) {
  // store a reference to the data
  // the reason for this is because of multitouch
  // we want to track the movement of this particular touch
  this.scale = event.data
}

function onDragEnd () {
  this.alpha = 1
  this.dragging = false
  // set the interaction data to null
  this.data = null
}

function onDragMove () {
  if (this.dragging) {
    const newPosition = this.data.getLocalPosition(this.parent)

    const moveX = -(this.x - newPosition.x)
    const moveY = -(this.y - newPosition.y)


    // this.x = newPosition.x
    // this.y = newPosition.y

    grid.forEach((el) => {
      el.changePosition(moveX, moveY)
    })
  }
}


export function init () {
  const map = document.getElementById('map') // eslint-disable-line
  const WIDTH = window.innerWidth // eslint-disable-line
  const HEIGHT = window.innerHeight // eslint-disable-line

  app = new PIXI.Application(WIDTH, HEIGHT, { transparent: true })
  map.appendChild(app.view)

  const container = new PIXI.Container()

  app.stage.addChild(container)

  grid = _.range(1, 10 + 1).map(id => new Hex(100 * id, 300))
  grid.forEach(el => el.render())


  // ----- create hex

  // function createWater (x, y) {
  //   const water = new PIXI.Sprite(texture)
  //   water.interactive = true
  //
  //   // this button mode will mean the hand cursor appears when you roll over the water with your mouse
  //   water.buttonMode = true
  //
  //   // center the water's anchor point
  //   water.anchor.set(0.5)
  //
  //   // make it a bit bigger, so it's easier to grab
  //   water.scale.set(0.5)
  //
  //   water
  //     .on('pointerdown', onDragStart)
  //     .on('pointerup', onDragEnd)
  //     .on('pointerupoutside', onDragEnd)
  //     .on('pointermove', onDragMove)
  //     .on('resize', onResize)
  //
  //   water.x = x
  //   water.y = y
  //
  //   app.stage.addChild(water)
  //
  //   return water
  // }


  // const waterTable = _.range(1, 10 + 1).map(id => new Hex(100 * id, 300, app))
}
