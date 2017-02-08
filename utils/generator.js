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

module.exports = {
  getNeighbours
}
