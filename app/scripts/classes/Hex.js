import _ from 'lodash'
import * as PIXI from 'pixi.js'

import Player from './Player'
import { armyMove } from '../sockets'

const me = new Player('john')

let moved = false
let selectedHex = null
let hoveredHex = null

let ctrlPressed = false

export function setMoved (m) {
  moved = m
}

const armyTextStyle = new PIXI.TextStyle({
  fontFamily: 'Arial',
  fontSize: 40,
  stroke: 'white'
})

const getArmyIconScale = (armyValue) => {
  const scale = (((armyValue || 0) / 100) * 0.05) + 0.05
  return scale > 0.1 ? 0.1 : scale
}

window.addEventListener('keydown', ({ keyCode }) => {
  if (keyCode === 80) {
    ctrlPressed = true
  }
})

window.addEventListener('keyup', ({ keyCode }) => {
  if (keyCode === 80) {
    ctrlPressed = false
  }
})

class Hex {
  constructor ({ id, x, y, type = 'grass', neighbours, owner, army, castle }) {
    this.handleClick = this.handleClick.bind(this)
    this.handleMouseOver = this.handleMouseOver.bind(this)

    this.container = new PIXI.Container()

    this.id = id
    this.x = x
    this.y = y
    this.type = type
    this.neighbours = neighbours
    this.owner = owner

    this.hex = new PIXI.Sprite(PIXI.Texture.fromImage(`images/${type}.png`))
    this.initializeItem(this.hex, this.x, this.y, 0.5)
    this.container.addChild(this.hex)

    this.borders = _.range(0, 6).map((index) => {
      const border = new PIXI.Sprite(PIXI.Texture.fromImage('images/border.png'))
      this.initializeItem(border, this.x, this.y, 0.5)
      border.rotation = index * (Math.PI / 3)
      this.container.addChild(border)
      return border
    })

    if (castle) {
      this.castle = new PIXI.Sprite(PIXI.Texture.fromImage('images/castle.svg'))
      this.initializeItem(this.castle, this.hex.x, this.hex.y, 0.1)
      this.container.addChild(this.castle)
    }

    this.armyNumber = new PIXI.Text(army || 0, { ...armyTextStyle, fill: owner ? `#${owner.color}` : '#000000' })
    this.initializeItem(this.armyNumber, this.hex.x, this.hex.y + 20, 0.5)
    this.armyNumber.visible = !!army
    this.container.addChild(this.armyNumber)

    this.armyIcon = new PIXI.Sprite(PIXI.Texture.fromImage('images/army.png'))
    this.armyIcon.visible = !!army
    if (owner) {
      this.armyIcon.tint = `0x${owner.color}`
    }
    this.initializeItem(this.armyIcon, this.hex.x, this.hex.y - 10, getArmyIconScale(army))
    this.container.addChild(this.armyIcon)

    // this.number = new PIXI.Text(this.id)
    // this.initializeItem(this.number, this.hex.x, this.hex.y, 0.5)
    // this.container.addChild(this.number)
  }

  initializeItem (item, x, y, scale) {
    item.interactive = true
    item.buttonMode = true
    item.anchor.set(0.5)
    item.click = this.handleClick
    item.mouseover = this.handleMouseOver
    item.contain = item
    item.scale.set(scale)
    item.x = x
    item.y = y
  }

  reinitializeBordersWithNeighbours () {
    if (this.grid) {
      this.reinitializeBorders()
      this.neighbours.forEach(({ id }) => {
        this.grid[id].reinitializeBorders()
      })
    }
  }

  reinitializeBorders () {
    if (this.owner && this.grid) {
      this.neighbours.forEach(({ id, index }) => {
        const neighbour = this.grid[id]
        if ((neighbour.owner && neighbour.owner.id === this.owner.id) || neighbour.type === 'water') {
          this.borders[index].visible = false
        } else {
          this.borders[index].visible = true
          this.borders[index].tint = `0x${this.owner.color}`
        }
      })
    } else {
      this.borders.forEach((border) => {
        border.visible = false
      })
    }
  }

  handleClick () {
    if (!moved) {
      let armyMoved = false
      me.register({ hexId: this.id })

      if (selectedHex !== null && this.grid[selectedHex]) {
        this.changeHexTint(0xFFFFFF, { id: selectedHex })
        this.grid[selectedHex].neighbours.forEach(this.changeHexTint.bind(this, 0xFFFFFF))

        if (this.grid[selectedHex].armyNumber && selectedHex !== this.id) {
          armyMove(ctrlPressed, selectedHex, this.id)
          armyMoved = true
          selectedHex = null
          this.grid[hoveredHex].hex.tint = 0xFFFFFF
          hoveredHex = null
        }
      }

      if (this.armyNumber.visible && this.owner && me.id === this.owner.id && !armyMoved) {
        this.hex.tint = 0x99FF99
        selectedHex = this.id
      }
    }
  }

  handleMouseOver () {
    if (selectedHex) {
      if (hoveredHex) {
        this.grid[hoveredHex].hex.tint = 0xFFFFFF
      }
      this.hex.tint = 0x99FF99
      this.grid[selectedHex].hex.tint = 0x99FF99
      hoveredHex = this.id
    }
  }

  changeOwner (owner) {
    if (owner) {
      this.owner = owner
      this.armyNumber.style.fill = `#${owner.color}`
      this.armyIcon.tint = `0x${owner.color}`
    }
    this.reinitializeBordersWithNeighbours()
  }

  changeHexTint (color, { id }) {
    this.grid[id].hex.tint = color
  }

  changeArmyValue (value, player) {
    this.armyNumber.text = value
    this.armyNumber.visible = !!value
    this.armyIcon.scale.set(getArmyIconScale(value))
    this.armyIcon.visible = !!value
    this.changeOwner(player)
  }

  render (globalContainer, grid) {
    globalContainer.addChild(this.container)
    this.grid = grid
    this.reinitializeBorders()
  }
}


export default Hex
