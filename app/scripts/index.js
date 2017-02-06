import _ from 'lodash'
import * as PIXI from 'pixi.js'


let renderer
let stage

function createMap (width, height, x) {

  const unit = x * Math.sqrt(3) / 2

  // const line = [
  //   ..._.range(1, width + 1).map(id => new Hex(id * (2 * unit + x), 100, unit)),
  //   ..._.range(1, width + 1).map(id => new Hex(id * (2 * unit + x) + unit + x / 2, 100 + unit, unit))
  // ]

  const line = _.range(0, height).reduce((acc, curr) => {
    return [
      ...acc,
      ..._.range(1, width + 1).map(id => new Hex(id * (2 * unit + x) + (curr % 2 === 0 ? 0 : unit + x / 2), 100 + curr * unit, unit))
    ]
  }, [])

  return line

}

class Hex {
  constructor (x, y, s = 50) {
    this.hex = new PIXI.Graphics()
    this.hex.interactive = true
    this.x = x
    this.y = y
    this.s = s

    this.selected = false

    this.hex.buttonMode = true
    this.hex.click = () => {

      this.selected = !this.selected

      this.hex.clear()
      this.render(this.selected ? 0x00FF00 : 0xFF0000)

    }
  }

  render (color = 0x66CCFF) {
    const s = this.s
    // this.hex.lineStyle(2, 0xFF3300, 1)
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

    stage.addChild(this.hex)
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

  renderer = PIXI.autoDetectRenderer(WIDTH, HEIGHT, null, true, true)

  map.appendChild(renderer.view)

  stage = new PIXI.Container()

  createMap(10,20,30).forEach(hex => hex.render())


  renderer.render(stage)
  gameLoop()
}
