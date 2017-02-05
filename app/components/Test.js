import React, { Component } from 'react'
import injectTapEventPlugin from 'react-tap-event-plugin'

class Test extends Component {

  componentWillMount () {
    injectTapEventPlugin()
  }

  render () {
    return (
      <div>
        hahahahahfhsss
      </div>
    )
  }
}

export default Test
