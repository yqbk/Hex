import React, { Component } from 'react'
import ReactDOM from 'react-dom'

import Test from './components/Test'

ReactDOM.render(
  <Test />,
  document.getElementById('root')
)

if (module.hot) {
  module.hot.accept()
}
