const _ = require('lodash')
const fs = require('fs')

const generator = require('./utils/generator')

const mapWidth = 15
const mapHeight = 15
const size = 85

const castles = [20, 76, 200, 57, 177, 13, 98]

const map = _.range(0, mapWidth * mapHeight)
  .map(id => ({
    id,
    x: ((id % mapWidth) * size) + ((id % (2 * mapWidth)) >= mapWidth ? size / 2 : 0) + 600,
    y: ((size - 10) * Math.floor(id / mapWidth)) + 200,
    neighbours: generator.getNeighbours(id, mapWidth, mapHeight),
    type: generator.getType(id),
    castle: castles.includes(id)
  }))

fs.writeFile('static/map.json', JSON.stringify(map))
