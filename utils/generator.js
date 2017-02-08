const _ = require('lodash')

function getNeighbours (id, mapWidth = 15, mapHeight = 15) {
  const evenRow = (id % (2 * mapWidth)) >= mapWidth
  return [
    ...(id % mapWidth !== 0 ? [id - 1] : []), // left
    ...(id >= mapWidth && id % (2 * mapWidth) !== 0 ? [id - (evenRow ? 15 : 16)] : []), // left-top
    ...(id >= mapWidth && (id + 1) % (2 * mapWidth) !== 0 ? [id - (evenRow ? 14 : 15)] : []), // right-top
    ...((id + 1) % mapWidth !== 0 ? [id + 1] : []), // right
    ...(id < mapWidth * (mapHeight - 1) && (id + 1) % (2 * mapWidth) !== 0 ? [id + (evenRow ? 16 : 15)] : []), // right-bottom
    ...(id < mapWidth * (mapHeight - 1) && id % (2 * mapWidth) !== 0 ? [id + (evenRow ? 15 : 14)] : []) // left-bottom
  ]
}

module.exports = {
  getNeighbours
}
