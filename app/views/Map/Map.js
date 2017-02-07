import React, { Component } from 'react'

import { init } from '../../scripts/index'
import { connect } from '../../scripts/sockets'

class Map extends Component {

  componentDidMount () {
    init()
    connect()
  }

  render () {
    return (
      <div id="map" style={{color: 0xFFFFFF}}>

      </div>
    )
  }
}

export default Map
