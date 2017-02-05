import React from 'react'
import ReactDOM from 'react-dom'

import Test from './components/Test'

ReactDOM.render(
  <Test />,
  document.getElementById('root')  // eslint-disable-line
)

if (module.hot) {
  module.hot.accept()
}
