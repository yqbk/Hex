import React, { Component } from 'react'

import { init } from '../../scripts/index'

class Map extends Component {

  componentDidMount () {
    init()
  }

  render () {
    return (
      <div id="map">

      </div>
    )
  }
}

export default Map
