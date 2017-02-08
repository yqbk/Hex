import * as PIXI from 'pixi.js'


class Hex {
  constructor (x, y, scale = 0.5, type = 'grass', id = 1) {
    this.handleClick = this.handleClick.bind(this)

    this.x = x
    this.y = y
    this.scale = scale
    this.type = type
    this.id = id
    this.neighbours = 0;
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

  addIdToImage (container) {
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

  handleClick (moved) {
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
    this.constructor(this.x, this.y, this.scale, type, this.id)
  }

  changePosition (moveX, moveY) {
    this.hex.x += moveX
    this.hex.y += moveY
  }

  addCastle (container, moved) {
    this.castle = new PIXI.Sprite(PIXI.Texture.fromImage('images/castle.svg'))
    this.castle.anchor.set(0.5)
    this.castle.scale.set(0.1)
    this.castle.x = this.hex.x
    this.castle.y = this.hex.y

    this.castle.interactive = true
    this.castle.buttonMode = true
    this.castle.click = () => this.handleClick(moved)

    this.hex.contain = 'castle'

    container.addChild(this.castle)
  }

  addArmy (container, moved) {

    this.army = new PIXI.Sprite(PIXI.Texture.fromImage('images/army.png'))
    this.army.anchor.set(0.5)
    this.army.scale.set(0.1)
    this.army.x = this.hex.x
    this.army.y = this.hex.y


    this.army.interactive = true
    this.army.buttonMode = true
    this.army.click = () => this.handleClick(moved)

    this.hex.contain = 'army'

    container.addChild(this.army)
  }

  showRange () {

    //   const oneStepRange = (this.id % (2 * WIDTH)) >= WIDTH ?
    //     [this.id, this.id + 1, this.id - 1, this.id + WIDTH, this.id + WIDTH + 1, this.id - WIDTH, this.id - WIDTH + 1] :
    //     [this.id, this.id + 1, this.id - 1, this.id + WIDTH, this.id + WIDTH + 1, this.id - WIDTH, this.id - WIDTH + 1]
    //
    //   const twoStepRange = (this.id % (2 * WIDTH)) >= WIDTH ?
    //     [this.id + 2, this.id - 2, this.id + WIDTH + 2, this.id + WIDTH - 1, this.id + 2 * WIDTH, this.id + 2 * WIDTH + 1, this.id + 2 * WIDTH - 1,
    //     this.id - WIDTH + 2, this.id - WIDTH - 1, this.id - 2 * WIDTH, this.id - 2 * WIDTH + 1, this.id - 2 * WIDTH - 1] :
    //     [this.id + 2, this.id - 2,
    //       this.id + WIDTH - 2, this.id + WIDTH - 1, this.id + 2 * WIDTH, this.id + 2 * WIDTH + 1, this.id + 2 * WIDTH - 1,
    //       this.id - WIDTH - 2, this.id - WIDTH - 1, this.id - 2 * WIDTH, this.id - 2 * WIDTH + 1, this.id - 2 * WIDTH - 1]
    //
    // //
    //   const range = oneStepRange.concat(twoStepRange)
    //   console.log(range)
    //   range.forEach((id) => {
    //     grid[id - 1].hex.tint = 0x00FF00
    //   })
  }

  destroyArmy () {
    // this.army.destroy()
  }


  render (container) {
    container.addChild(this.hex)
  }
}


export default Hex
