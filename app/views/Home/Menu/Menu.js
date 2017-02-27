import React, { Component, PropTypes } from 'react'

import listener, { joinQueue } from '../../../scripts/sockets'
import { QUEUE_JOINED, START_COUNTDOWN } from '../../../scripts/actions'

import style from './Menu.scss'

class Menu extends Component {
  constructor () {
    super()

    this.handleReset = this.handleReset.bind(this)
    this.joinQueue = this.joinQueue.bind(this)
    this.startCooldown = this.startCooldown.bind(this)

    this.state = {
      queueJoined: false,
      gameFound: false,
      cooldown: 5
    }

    this.startingScreen = false
  }

  componentDidMount () {
    listener()
      .on(QUEUE_JOINED, ({ id }) => {
        sessionStorage.setItem('id', id)
        this.setState({
          queueJoined: true
        })
      })
      .on(START_COUNTDOWN, () => {
        console.log('start countdown')
        this.startingScreen = true
        this.setState({
          queueJoined: false,
          gameFound: true
        }, () => setTimeout(this.startCooldown, 1000))
      })
  }

  componentWillUnmount () {
    this.startingScreen = false
  }

  startCooldown () {
    const { cooldown } = this.state
    if (cooldown > 0 && this.startingScreen) {
      this.setState({
        cooldown: cooldown - 1
      })
      setTimeout(this.startCooldown, 1000)
    }
  }

  handleReset () {
    const { onNameChange } = this.props
    sessionStorage.removeItem('username')
    onNameChange('')
  }

  joinQueue () {
    const { username } = this.props
    joinQueue(username)
  }

  render () {
    const { username } = this.props
    const { queueJoined, gameFound, cooldown } = this.state
    return (
      <div className={style.container}>
        <div>
          Hello <b>{username}</b>!
        </div>
        <button onClick={this.handleReset}>Reset name</button>
        <button onClick={this.joinQueue}>Play</button>
        {queueJoined && <div>Queue Joined</div>}
        {gameFound && <div>Game Found! Starting in {cooldown}</div>}
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
