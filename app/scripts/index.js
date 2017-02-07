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
    // this.hex.lineStyle(3, 0x000000, 1)
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
    // this.hex.antialias = true

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

  const app = new PIXI.Application(WIDTH, HEIGHT, { transparent: true });
  map.appendChild(app.view);

  const container = new PIXI.Container();

  app.stage.addChild(container);

  //--------------------------
  // renderer = PIXI.autoDetectRenderer(WIDTH, HEIGHT, null, true, true)
  // renderer.backgroundColor = 0xFFFFFF
  //
  // map.appendChild(renderer.view)

  // stage = new PIXI.Container()

  // createMap(15,20,40,app).forEach(hex => hex.render())

  var texture = PIXI.Texture.fromImage('water.png');



  function createBunny(x, y) {

    // create our little bunny friend..
    var bunny = new PIXI.Sprite(texture);

    // enable the bunny to be interactive... this will allow it to respond to mouse and touch events
    bunny.interactive = true;

    // this button mode will mean the hand cursor appears when you roll over the bunny with your mouse
    bunny.buttonMode = true;

    // center the bunny's anchor point
    bunny.anchor.set(0.5);

    // make it a bit bigger, so it's easier to grab
    bunny.scale.set(0.5);

    // setup events for mouse + touch using
    // the pointer events
    bunny
      .on('pointerdown', onDragStart)
      .on('pointerup', onDragEnd)
      .on('pointerupoutside', onDragEnd)
      .on('pointermove', onDragMove)
      .on('resiza', onResize);

    // For mouse-only events
    // .on('mousedown', onDragStart)
    // .on('mouseup', onDragEnd)
    // .on('mouseupoutside', onDragEnd)
    // .on('mousemove', onDragMove);

    // For touch-only events
    // .on('touchstart', onDragStart)
    // .on('touchend', onDragEnd)
    // .on('touchendoutside', onDragEnd)
    // .on('touchmove', onDragMove);

    // move the sprite to its designated position
    bunny.x = x;
    bunny.y = y;

    // add it to the stage
    app.stage.addChild(bunny);
  }

  function onDragStart(event) {
    // store a reference to the data
    // the reason for this is because of multitouch
    // we want to track the movement of this particular touch
    this.data = event.data;
    this.alpha = 0.5;
    this.dragging = true;
  }

  function onResize(event) {
    // store a reference to the data
    // the reason for this is because of multitouch
    // we want to track the movement of this particular touch
    this.scale = event.data;
  }

  function onDragEnd() {
    this.alpha = 1;
    this.dragging = false;
    // set the interaction data to null
    this.data = null;
  }

  function onDragMove() {
    if (this.dragging) {
      var newPosition = this.data.getLocalPosition(this.parent);
      this.x = newPosition.x;
      this.y = newPosition.y;
    }
  }

  createBunny(300,300)


  // let test = new Hex(100,100,40, app)
  //
  // test.render()


  // renderer.render(stage)
  // gameLoop()
}
