import React from 'react'
import ReactDOM from 'react-dom'

import Map from './views/Map/Map'

ReactDOM.render(
  <Map />,
  document.getElementById('root')  // eslint-disable-line
)

if (module.hot) {
  module.hot.accept()
}
