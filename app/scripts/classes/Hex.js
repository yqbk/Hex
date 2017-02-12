import _ from 'lodash'
import * as PIXI from 'pixi.js'

import Player from './Player'
import { armyMove } from '../sockets'

const me = new Player('john')

let moved = false
let selectedHex

export function setMoved (m) {
  moved = m
}

const armyTextStyle = new PIXI.TextStyle({
  fontFamily: 'Arial',
  fontSize: 60
})

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

    if (army) {
      this.changeArmyValue(army, owner)
    }
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
        if (neighbour.owner && neighbour.owner.id === this.owner.id) {
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

  startMovingArmy (from, to, number) {
    const directions = this.grid[from].neighbours

    for (const move of directions) {
      // console.log(`${number} - move.x : ${this.grid[move].x}  \nto.y. : ${this.grid[to].x}  \nfrom.x. : ${this.grid[from].x} \n `)
      // console.log(`diff: ${Math.abs(this.grid[move].x - this.grid[to].x)} --- ${Math.abs(this.grid[to].x - this.grid[from].x)}`)        //
      // console.log(Math.abs(this.grid[move].x - this.grid[to].x) <= Math.abs(this.grid[to].x - this.grid[from].x))

      if ((Math.abs(this.grid[move].x - this.grid[to].x) + (Math.abs(this.grid[move].y - this.grid[to].y)))
        <= (Math.abs(this.grid[to].x - this.grid[from].x) + Math.abs(this.grid[to].y - this.grid[from].y))) {
        setTimeout(() => {
          armyMove(from, this.grid[move].id, number)
          this.startMovingArmy(this.grid[move].id, to, number)
        }, 1000)

        console.log(`move from ${from} to ${this.grid[move].id}`)
        break
      }
    }
  }

  handleClick () {
    if (!moved) {
      me.register({ hexId: this.id })

      if (this.grid[selectedHex]) {
        this.changeHexTint(0xFFFFFF, { id: selectedHex })
        this.grid[selectedHex].neighbours.forEach(this.changeHexTint.bind(this, 0xFFFFFF))

        if (this.grid[selectedHex].army && _.find(this.grid[selectedHex].neighbours, { id: this.id })) {
          this.startMovingArmy(selectedHex, this.id, 10)
        }
      }

      this.hex.tint = 0x99FF99

      if (this.army) {
        this.neighbours.forEach(this.changeHexTint.bind(this, 0xCCFFCC))
      }

      selectedHex = this.id
    }
  }

  changeOwner (owner) {
    this.owner = owner
    this.reinitializeBordersWithNeighbours()
  }

  changeHexTint (color, { id }) {
    this.grid[id].hex.tint = color
  }

  changeArmyValue (value, player) {
    if (this.army) {
      this.army.destroy()
    }

    if (value !== 0) {
      this.army = new PIXI.Text(value, armyTextStyle)
      this.initializeItem(this.army, this.hex.x, this.hex.y, 0.5)
      this.container.addChild(this.army)
      if (player) {
        this.changeOwner(player)
      }
    }
    this.reinitializeBordersWithNeighbours()
  }

  render (globalContainer, grid) {
    globalContainer.addChild(this.container)
    this.grid = grid
    this.reinitializeBorders()
  }
}


export default Hex
