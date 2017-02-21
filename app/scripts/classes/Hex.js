import _ from 'lodash'
import PIXIDisplay from 'pixi-display' // eslint-disable-line
import * as PIXI from 'pixi.js'

import Player from './Player'
import { armyMove, stopMove } from '../sockets'

export const me = new Player('john')

let moved = false
let selectedHex = null
let hoveredHex = null

let ctrlPressed = false

const displayGroupsList = ['hexex', 'borders', 'battleIcons', 'castles', 'armyNumbers', 'armyIcons']
const displayGroups = displayGroupsList.reduce((acc, curr, index) => ({
  ...acc,
  [curr]: new PIXI.DisplayGroup(index)
}), {})


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
    this.handleMouseLeave = this.handleMouseLeave.bind(this)

    this.container = new PIXI.Container()

    this.id = id
    this.x = x
    this.y = y
    this.type = type
    this.neighbours = neighbours
    this.owner = owner

    this.hex = new PIXI.Sprite(PIXI.Texture.fromImage(`images/${type}.png`))
    this.initializeItem(this.hex, this.x, this.y, 0.5, 'hexes')
    this.container.addChild(this.hex)

    this.borders = _.range(0, 6).map((index) => {
      const border = new PIXI.Sprite(PIXI.Texture.fromImage('images/border.png'))
      this.initializeItem(border, this.x, this.y, 0.5, 'borders')
      border.rotation = index * (Math.PI / 3)
      this.container.addChild(border)
      return border
    })

    this.battleIcons = _.range(0, 6).map((index) => {
      const battleIcon = new PIXI.Sprite(PIXI.Texture.fromImage('images/battle.png'))
      const [inX, inY] = [this.x - 20, this.y - 38]
      const angle = index * (Math.PI / 3)
      const battleIconX = (((inX - this.x) * Math.cos(angle)) - ((inY - this.y) * Math.sin(angle))) + this.x
      const battleIconY = (((inX - this.x) * Math.sin(angle)) + ((inY - this.y) * Math.cos(angle))) + this.y
      this.initializeItem(battleIcon, battleIconX, battleIconY, 0.3, 'battleIcons')
      battleIcon.visible = false
      this.container.addChild(battleIcon)
      return battleIcon
    })

    if (castle) {
      this.castle = new PIXI.Sprite(PIXI.Texture.fromImage('images/castle.svg'))
      this.initializeItem(this.castle, this.hex.x, this.hex.y, 0.1, 'castles')
      this.container.addChild(this.castle)
    }

    this.armyNumber = new PIXI.Text(army || 0, { ...armyTextStyle, fill: owner ? `#${owner.color}` : '#000000' })
    this.initializeItem(this.armyNumber, this.hex.x, this.hex.y + 20, 0.5, 'armyNumbers')
    this.armyNumber.visible = !!army
    this.container.addChild(this.armyNumber)

    this.armyIcon = new PIXI.Sprite(PIXI.Texture.fromImage('images/army.png'))
    this.armyIcon.visible = !!army
    if (owner) {
      this.armyIcon.tint = `0x${owner.color}`
    }
    this.initializeItem(this.armyIcon, this.hex.x, this.hex.y - 10, getArmyIconScale(army), 'armyIcons')
    this.container.addChild(this.armyIcon)

    // this.number = new PIXI.Text(this.id)
    // this.initializeItem(this.number, this.hex.x, this.hex.y, 0.5)
    // this.container.addChild(this.number)

    this.container.interactive = true
    this.container.buttonMode = true
    this.container.click = this.handleClick
    this.container.mouseover = this.handleMouseOver
    this.container.mouseout = this.handleMouseLeave
  }

  initializeItem (item, x, y, scale, displayGroup) {
    item.interactive = true
    item.buttonMode = true
    item.anchor.set(0.5)
    item.contain = item
    item.scale.set(scale)
    item.x = x
    item.y = y
    item.displayGroup = displayGroups[displayGroup]
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
      me.register(this.id)

      if (this.armyNumber.visible && this.moveId) {
        stopMove(this.id)
      }

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
    hoveredHex = this.id
    if (selectedHex) {
      this.hex.tint = 0x99FF99
    }
    // if (this.moveId) {
    //   getDestination(this.moveId)
    // }
  }

  clearDestinations () {
    if (this.destination && this.destination.length) {
      this.destination.forEach((id) => {
        this.grid[id].hex.tint = 0xFFFFFF
      })
      this.destination = []
    }
  }

  handleMouseLeave () {
    if (selectedHex && this.id !== selectedHex) {
      this.hex.tint = 0xFFFFFF
    }
    // this.clearDestinations()
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

  changeArmyValue (value, { player, moveId }) {
    if (moveId !== null) {
      this.moveId = moveId
    }
    this.armyNumber.text = value
    this.armyNumber.visible = !!value
    this.armyIcon.scale.set(getArmyIconScale(value))
    this.armyIcon.visible = !!value
    this.changeOwner(player)
    // if (hoveredHex === this.id) {
    //   getDestination(this.moveId)
    // }
  }

  setBattle (defenderId, state) {
    const { index } = _.find(this.neighbours, { id: defenderId }) || {}
    this.battleIcons[index].visible = state
  }

  render (globalContainer, grid) {
    globalContainer.addChild(this.container)
    this.grid = grid
    this.reinitializeBorders()
  }
}


export default Hex
