import _ from 'lodash'
import PIXIDisplay from 'pixi-display' // eslint-disable-line
import * as PIXI from 'pixi.js'

import me from './Player'
import { armyMove } from '../sockets'

let moved = false
let selectedHexIds = []

let ctrlPressed = false

const displayGroupsList = [
  'hexex',
  'borders',
  'battleIcons',
  'castles',
  'armyNumbers',
  'armyIcons',
  'shadows',
  'shadowCastles'
]

const displayGroups = displayGroupsList.reduce((acc, curr, index) => ({
  ...acc,
  [curr]: new PIXI.DisplayGroup(index)
}), {})

export function setSelectedHexIds (value) {
  selectedHexIds = value
}

export function getSelectedHexIds () {
  return selectedHexIds
}

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
    this.changeShadowVisibility = this.changeShadowVisibility.bind(this)

    this.container = new PIXI.Container()

    this.id = id
    this.x = x
    this.y = y
    this.type = type
    this.neighbours = neighbours
    this.owner = owner

    this.hex = new PIXI.Sprite(PIXI.loader.resources[type].texture)
    this.initializeItem(this.hex, this.x, this.y, 0.5, 'hexes')
    this.container.addChild(this.hex)

    this.borders = _.range(0, 6).map((index) => {
      const border = new PIXI.Sprite(PIXI.loader.resources.border.texture)
      this.initializeItem(border, this.x, this.y, 0.5, 'borders')
      border.rotation = index * (Math.PI / 3)
      border.visible = false
      this.container.addChild(border)
      return border
    })

    this.battleIcons = _.range(0, 6).map((index) => {
      const battleIcon = new PIXI.Sprite(PIXI.loader.resources.battle.texture)
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
      this.castle = new PIXI.Sprite(PIXI.loader.resources.castle.texture)
      this.initializeItem(this.castle, this.hex.x, this.hex.y, 0.1, 'castles')
      this.container.addChild(this.castle)

      this.shadowCastle = new PIXI.Sprite(PIXI.loader.resources.castle.texture)
      this.initializeItem(this.shadowCastle, this.hex.x, this.hex.y, 0.1, 'shadowCastles')
      this.container.addChild(this.shadowCastle)
    }

    this.armyNumber = new PIXI.Text(army || 0, { ...armyTextStyle, fill: owner ? `#${owner.color}` : '#000000' })
    this.initializeItem(this.armyNumber, this.hex.x, this.hex.y + 20, 0.5, 'armyNumbers')
    this.armyNumber.visible = !!army
    this.container.addChild(this.armyNumber)

    this.armyIcon = new PIXI.Sprite(PIXI.loader.resources.army.texture)
    this.armyIcon.visible = !!army
    if (owner) {
      this.armyIcon.tint = `0x${owner.color}`
    }
    this.initializeItem(this.armyIcon, this.hex.x, this.hex.y - 10, getArmyIconScale(army), 'armyIcons')
    this.container.addChild(this.armyIcon)

    // this.number = new PIXI.Text(this.id)
    // this.initializeItem(this.number, this.hex.x, this.hex.y, 0.5)
    // this.container.addChild(this.number)

    this.shadow = new PIXI.Sprite(PIXI.loader.resources[type].texture)
    this.initializeItem(this.shadow, this.hex.x, this.hex.y, 0.5, 'shadows')
    this.shadow.tint = 0x898989
    this.container.addChild(this.shadow)

    this.container.interactive = true
    this.container.click = this.handleClick
    this.container.mouseover = this.handleMouseOver
    this.container.mouseout = this.handleMouseLeave
  }

  initializeItem (item, x, y, scale, displayGroup) {
    item.interactive = true
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
      if (!selectedHexIds.length) {
        if (this.armyNumber.visible && this.owner && this.owner.id === me.id) {
          this.select()
        }
      } else {
        selectedHexIds.forEach((id) => {
          if (this.grid[id].owner && this.grid[id].owner.id === me.id) {
            armyMove(ctrlPressed, id, this.id)
          }
          this.grid[id].deselect()
        })
      }
    }
  }

  handleMouseOver () {
    if (selectedHexIds.length) {
      this.hex.tint = 0x99FF99
    }
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
    if (!selectedHexIds.length || !selectedHexIds.includes(this.id)) {
      this.hex.tint = 0xFFFFFF
    }
  }

  changeOwner (owner, value) {
    if (owner) {
      this.owner = owner
      this.armyNumber.style.fill = `#${owner.color}`
      this.armyIcon.tint = `0x${owner.color}`
    }

    if (this.owner && this.owner.id === me.id && (value !== 0 || this.castle)) {
      if (!me.ownedHexIds.includes(this.id)) {
        me.ownedHexIds = [...me.ownedHexIds, this.id]
      }
    } else {
      me.ownedHexIds = me.ownedHexIds.filter(id => id !== this.id)
    }
  }

  changeHexTint (color, { id }) {
    this.grid[id].hex.tint = color
  }

  changeShadowVisibility (visible) {
    this.shadow.visible = visible
    if (this.shadowCastle) {
      this.shadowCastle.visible = visible
    }
  }

  changeArmyValue (value, { player, moveId, from }) {
    this.moveId = moveId
    this.armyNumber.text = value
    this.armyNumber.visible = !!value
    this.armyIcon.scale.set(getArmyIconScale(value))
    this.armyIcon.visible = !!value
    this.container.buttonMode = !!value && player && player.id === me.id
    this.changeOwner(player, value)

    if (from && selectedHexIds.includes(from)) {
      this.grid[from].deselect()
      this.select()
    }

    this.changeShadowVisibility(true)
    this.neighbours.forEach(({ id }) => {
      this.grid[id].changeShadowVisibility(true)
      this.grid[id].neighbours.forEach(({ id: nId }) => {
        this.grid[nId].changeShadowVisibility(true)
      })
    })

    me.ownedHexIds.forEach((id) => {
      this.grid[id].changeShadowVisibility(false)
      this.grid[id].neighbours.forEach(({ id: nId }) => {
        this.grid[nId].changeShadowVisibility(false)
        this.grid[nId].neighbours.forEach(({ id: nnId }) => {
          this.grid[nnId].changeShadowVisibility(false)
        })
      })
    })
  }

  select () {
    this.hex.tint = 0x99FF99
    selectedHexIds = [...selectedHexIds, this.id]
  }

  deselect () {
    this.hex.tint = 0xFFFFFF
    selectedHexIds = selectedHexIds.filter(id => id !== this.id)
  }

  setBattle (defenderId, state) {
    const { index } = _.find(this.neighbours, { id: defenderId }) || {}
    this.battleIcons[index].visible = state
  }

  render (globalContainer, grid) {
    globalContainer.addChild(this.container)
    this.grid = grid
  }
}


export default Hex
