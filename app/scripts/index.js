import _ from 'lodash'
import * as PIXI from 'pixi.js'

let renderer
let stage

function createMap (width, height, x, app) {
  const unit = x * Math.sqrt(3) / 2

  const line = _.range(0, height).reduce((acc, curr) => {
    return [
      ...acc,
      ..._.range(1, width + 1).map(id => new Hex(id * (2 * unit + x) + (curr % 2 === 0 ? 0 : unit + x / 2), 2 * x + curr * ( unit - 3 ) , unit, app))
    ]
  }, [])

  return line
}

class Hex {
  constructor (x, y, s = 50, app) {
    this.hex = new PIXI.Graphics()
    this.hex.interactive = true
    this.x = x
    this.y = y
    this.s = s
    this.app = app

    this.selected = false

    this.hex.buttonMode = true
    this.hex.click = () => {

      this.selected = !this.selected

      this.hex.clear()
      this.render(this.selected ? 0x00FF00 : 0x66CCFF)

    }
  }

  render (color = 0x66CCFF) {
    const s = this.s
    this.hex.lineStyle(3, 0x000000, 1)
    this.hex.beginFill(color)
    const halfWidth = (s * Math.sqrt(3)) / 2
    const relativePoints = [
      -halfWidth, -s / 2,
      0, -s,
      halfWidth, -s / 2,
      halfWidth, s / 2,
      0, s,
      -halfWidth, s / 2
    ]
    this.hex.drawPolygon(relativePoints)
    this.hex.endFill()
    this.hex.x = this.x
    this.hex.y = this.y
    this.hex.rotation = Math.PI / 2

    this.hex.hitArea = new PIXI.Polygon(...relativePoints)

    this.app.stage.addChild(this.hex);
  }
}


function gameLoop () {
  requestAnimationFrame(gameLoop) // eslint-disable-line
  renderer.render(stage)
}

export function init () {
  const map = document.getElementById('map') // eslint-disable-line
  const WIDTH = window.innerWidth // eslint-disable-line
  const HEIGHT = window.innerHeight // eslint-disable-line

  const app = new PIXI.Application(WIDTH, HEIGHT, { backgroundColor: 0x1099bb});
  map.appendChild(app.view);

  const container = new PIXI.Container();

  app.stage.addChild(container);

  //--------------------------
  // renderer = PIXI.autoDetectRenderer(WIDTH, HEIGHT, null, true, true)
  // renderer.backgroundColor = 0xFFFFFF
  //
  // map.appendChild(renderer.view)

  // stage = new PIXI.Container()

  createMap(15,20,40,app).forEach(hex => hex.render())

  // let test = new Hex(100,100,40, app)
  //
  // test.render()


  // renderer.render(stage)
  // gameLoop()
}
