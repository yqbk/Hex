import React, { Component } from 'react'

import init from '../../../../scripts/index'

class Map extends Component {

  componentDidMount () {
    const { spawnPosition } = this.props
    init(spawnPosition)
  }

  render () {
    return (
      <div id="map" style={{ color: 0xFFFFFF }} />
    )
  }
}

export default Map
