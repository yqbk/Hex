import _ from 'lodash'
import * as PIXI from 'pixi.js'

import Player from './Player'
import { armyMove } from '../sockets'

const me = new Player('john')

let moved = false
let selectedHex = null

export function setMoved (m) {
  moved = m
}

const armyTextStyle = new PIXI.TextStyle({
  fontFamily: 'Arial',
  fontSize: 40,
  stroke: 'white'
})

// function sizeObj (obj) {
//   return Object.keys(obj).length
// }

class Hex {
  constructor ({ id, x, y, type = 'grass', neighbours, owner, army, castle }) {
    this.handleClick = this.handleClick.bind(this)

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

    this.army = new PIXI.Text(army || 0, { ...armyTextStyle, fill: owner ? `#${owner.color}` : '#000000' })
    this.initializeItem(this.army, this.hex.x, this.hex.y + 20, 0.5)
    this.army.visible = !!army
    this.container.addChild(this.army)

    // this.path = []
    // this.pathLine = 0

    // this.number = new PIXI.Text(this.id)
    // this.initializeItem(this.number, this.hex.x, this.hex.y, 0.5)
    // this.container.addChild(this.number)
  }

  initializeItem (item, x, y, scale) {
    item.interactive = true
    item.buttonMode = true
    item.anchor.set(0.5)
    item.click = this.handleClick
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

  // definePath (from, to) {
  //   // todo to rebuild later to improve performance (odległość punktu od prostej wyznaczonej przez punkty from, to)
  //   const list = this.grid[from].neighbours
  //   const directions = []
  //   list.forEach((el) => { directions.push(el.id) })
  //
  //   if (directions.includes(this.grid[to].id)) {
  //     return [this.grid[to].id]
  //   }
  //
  //   const path = []
  //
  //   for (const move of directions) {
  //     const newDistance = Math.abs(this.grid[move].x - this.grid[to].x)
  //       + Math.abs(this.grid[move].y - this.grid[to].y)
  //     const oldDistance = Math.abs(this.grid[to].x - this.grid[from].x)
  //       + Math.abs(this.grid[to].y - this.grid[from].y)
  //
  //     if (newDistance < oldDistance) {
  //       const result = this.definePath(move, to)
  //       path.push([move, ...result])
  //     }
  //   }
  //   path.sort((a, b) => sizeObj(a) - sizeObj(b))
  //
  //   return path.shift()
  // }

  // drawPath () {
  //   // todo need to bring path to the top!!!
  //   if (this.pathLine !== 0) {
  //     console.log('--- DELETE pathLine')
  //     this.pathLine.destroy()
  //   }
  //
  //   console.log(' create pathline')
  //   this.pathLine = new PIXI.Graphics().lineStyle(5, 0xf3a33f)
  //
  //   this.pathLine.moveTo(this.grid[this.path[0]].x, this.grid[this.path[0]].y)
  //   // this.path.shift()
  //
  //   this.path.forEach((el) => {
  //     this.pathLine.lineTo(this.grid[el].x, this.grid[el].y)
  //     // this.pathLine.bezierCurveTo(this.grid[el].x, this.grid[el].y)
  //   })
  //
  //   this.container.addChild(this.pathLine)
  // }

  // followPath () {
  //   // todo logic should be moved to server side?
  //   if (this.path.length > 1) {
  //     setTimeout(() => {
  //       this.drawPath()
  //       armyMove(this.path.shift(), this.path[0])
  //       this.followPath()
  //     }, 500)
  //   }
  // }

  handleClick () {
    if (!moved) {
      me.register({ hexId: this.id })

      if (selectedHex !== null && this.grid[selectedHex]) {
        this.changeHexTint(0xFFFFFF, { id: selectedHex })
        this.grid[selectedHex].neighbours.forEach(this.changeHexTint.bind(this, 0xFFFFFF))

        // && _.find(this.grid[selectedHex].neighbours, { id: this.id })
        if (this.grid[selectedHex].army) {
          // this.path = this.definePath(selectedHex, this.id)
          // this.path.unshift(selectedHex)
          // this.followPath()
          armyMove(selectedHex, this.id)
          selectedHex = null
        }
      }

      if (this.army.visible && this.owner && me.id === this.owner.id) {
        // this.neighbours.forEach(this.changeHexTint.bind(this, 0xCCFFCC))
        this.hex.tint = 0x99FF99
        selectedHex = this.id
      }
    }
  }

  changeOwner (owner) {
    if (owner) {
      this.owner = owner
      this.army.style.fill = `#${owner.color}`
    }
    this.reinitializeBordersWithNeighbours()
  }

  changeHexTint (color, { id }) {
    this.grid[id].hex.tint = color
  }

  changeArmyValue (value, player) {
    this.armyNumber.text = value

    if (this.armyNumber.text > 0) {
      this.army = new PIXI.Sprite(PIXI.Texture.fromImage('images/army.png'))
      if (this.armyNumber.text < 25) {
        this.initializeItem(this.army, this.hex.x, this.hex.y - 10, 0.025)
      } else if (this.armyNumber.text >= 25 && this.armyNumber.text < 75) {
        this.initializeItem(this.army, this.hex.x, this.hex.y - 10, 0.05)
      } else if (this.armyNumber.text >= 75) {
        this.initializeItem(this.army, this.hex.x, this.hex.y - 10, 0.1)
      }

      //todo tint doesn't work for our svg?
      this.army.tint = `0x${player.color}`

      this.container.addChild(this.army)
    }

    this.armyNumber.visible = !!value
    this.changeOwner(player)
  }

  render (globalContainer, grid) {
    globalContainer.addChild(this.container)
    this.grid = grid
    this.reinitializeBorders()
  }
}


export default Hex
