import React, { Component, PropTypes } from 'react'

import listener, { joinQueue } from '../../../scripts/sockets'
import { QUEUE_JOINED, START_COUNTDOWN } from '../../../scripts/actions'

import me from '../../../scripts/classes/Player'

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
        me.id = id
        this.setState({
          queueJoined: true
        })
      })
      .on(START_COUNTDOWN, () => {
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


        <video className={style.backgroundVideo} loop autoPlay>
          <source src="./background.mp4" />
        </video>
        <div className={style.loginContainer}>
          <div className={style.welcomeContainer}>
            Hello <b>{username}</b>!
          </div>
          <button className={style.playButton} onClick={this.joinQueue}>Play</button>
          <button className={style.resetButton} onClick={this.handleReset}>Reset name</button>
          {queueJoined && <div>Queue Joined</div>}
          {gameFound && <div>Game Found! Starting in {cooldown}</div>}
        </div>
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
