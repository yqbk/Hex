import React, { Component } from 'react'

import Map from './views/Map/Map'
import Notifications from './components/Notifications/Notifications'

class App extends Component {
  render () {
    return (
      <div>
        <Notifications />
        <Map />
      </div>
    )
  }
}

export default App
