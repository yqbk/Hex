import React, { Component, PropTypes } from 'react'

import listener, { joinQueue } from '../../../scripts/sockets'
import { QUEUE_JOINED } from '../../../scripts/actions'

class Menu extends Component {
  constructor () {
    super()

    this.handleReset = this.handleReset.bind(this)
    this.joinQueue = this.joinQueue.bind(this)

    this.state = {
      queueJoined: false
    }
  }

  componentDidMount () {
    listener()
      .on(QUEUE_JOINED, ({ id }) => {
        sessionStorage.setItem('id', id)
        this.setState({
          queueJoined: true
        })
      })
  }

  handleReset () {
    const { onNameChange } = this.props
    sessionStorage.removeItem('username')
    onNameChange('')
  }

  joinQueue () {
    joinQueue()
  }

  render () {
    const { username } = this.props
    const { queueJoined } = this.state
    return (
      <div>
        <div>
          Hello {username}! <button onClick={this.handleReset}>Reset name</button>
        </div>
        Menu
        <button onClick={this.joinQueue}>Play</button>
        {queueJoined && <div>Queue Joined</div>}
      </div>
    )
  }
}

Menu.propTypes = {
  username: PropTypes.string,
  onNameChange: PropTypes.func
}

Menu.defaultProps = {
  username: 'User',
  onNameChange: () => {}
}

export default Menu
