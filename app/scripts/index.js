import * as PIXI from 'pixi.js'

let renderer

class Hex {
  constructor () {

  }

  render () {

  }
}

export function init () {
  const map = document.getElementById('map')
  renderer = PIXI.autoDetectRenderer(500, 500)

  map.appendChild(renderer.view)

  const stage = new PIXI.Container()


  var rectangle = new PIXI.Graphics()
  rectangle.lineStyle(4, 0xFF3300, 1)
  rectangle.beginFill(0x66CCFF)
  rectangle.drawRect(0, 0, 64, 64)
  rectangle.endFill()
  rectangle.x = 170
  rectangle.y = 170
  stage.addChild(rectangle)


  renderer.render(stage)
}
