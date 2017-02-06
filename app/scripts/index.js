import * as PIXI from 'pixi.js'

let renderer
let stage

class Hex {
  constructor (x, y, s = 50) {
    this.hex = new PIXI.Graphics()
    this.hex.interactive = true
    this.x = x
    this.y = y
    this.s = s

    this.hex.buttonMode = true
    this.hex.click = () => {
      console.log('sdfsdfsdf')
    }
  }

  render () {
    const s = this.s
    this.hex.lineStyle(2, 0xFF3300, 1)
    this.hex.beginFill(0x66CCFF)
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

export function init () {
  const map = document.getElementById('map') // eslint-disable-line
  const WIDTH = window.innerWidth // eslint-disable-line
  const HEIGHT = window.innerHeight // eslint-disable-line

  renderer = PIXI.autoDetectRenderer(WIDTH, HEIGHT, null, true, true)

  map.appendChild(renderer.view)

  stage = new PIXI.Container()

  const hex1 = new Hex(100, 100)
  hex1.render()


  renderer.render(stage)
}
