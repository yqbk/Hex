function getNeighbours (id, mapWidth = 15, mapHeight = 15) {
  const evenRow = (id % (2 * mapWidth)) >= mapWidth
  return [
    ...(
      id % mapWidth !== 0
        ? [id - 1]
        : []
    ), // left

    ...(
      id >= mapWidth && id % (2 * mapWidth) !== 0
        ? [id - (evenRow ? mapWidth : (mapWidth + 1))]
        : []
    ), // left-top

    ...(
      id >= mapWidth && (id + 1) % (2 * mapWidth) !== 0
        ? [id - (evenRow ? (mapWidth - 1) : mapWidth)]
        : []
    ), // right-top

    ...(
      (id + 1) % mapWidth !== 0
        ? [id + 1]
        : []
    ), // right

    ...(
      id < mapWidth * (mapHeight - 1) && (id + 1) % (2 * mapWidth) !== 0
        ? [id + (evenRow ? (mapWidth + 1) : mapWidth)]
        : []
    ), // right-bottom

    ...(
      id < mapWidth * (mapHeight - 1) && id % (2 * mapWidth) !== 0
        ? [id + (evenRow ? mapWidth : (mapWidth - 1))]
        : []
    ) // left-bottom
  ]
}

function getType (id) {
  const water = [6, 21, 22, 37, 38, 39, 52, 53, 54, 68, 69, 70, 82, 83, 84, 98, 113, 99, 129, 114, 129, 130, 145,
    160, 174, 190, 191, 175, 205, 206, 220, 221, 222]
  const sand = [139, 154, 153, 168, 184, 185, 186, 200, 169, 170, 155, 215, 214, 199, 198, 213, 212, 210, 211, 197,
    196, 183, 182, 181, 167, 166, 167, 195, 180, 165]

  return (
    (water.includes(id) && 'water') ||
    (sand.includes(id) && 'sand') ||
    ('grass')
  )
}

module.exports = {
  getNeighbours,
  getType
}
