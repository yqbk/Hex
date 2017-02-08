const _ = require('lodash')
const fs = require('fs')

const generator = require('./utils/generator')

const mapWidth = 15
const mapHeight = 15

const map = _.range(0, mapWidth * mapHeight)
  .map(id => ({
    id,
    neighbours: generator.getNeighbours(id, mapWidth, mapHeight),
    type: generator.getType(id)
  }))

fs.writeFile('static/map.json', JSON.stringify(map, null, 2))
