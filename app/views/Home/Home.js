import React, { Component, PropTypes } from 'react'
import { connect } from 'react-redux'
import { browserHistory } from 'react-router'

import Name from '../../components/Name/Name'

import listener from '../../scripts/sockets'
import { LOADING_SCREEN } from '../../scripts/actions'
import me from '../../scripts/classes/Player'
import { setCurrentGame } from '../../actions'

class Home extends Component {
  constructor () {
    super()

    this.handleNameChange = this.handleNameChange.bind(this)
    this.handleConnect = this.handleConnect.bind(this)

    this.state = {
      connected: false,
      username: localStorage.getItem('username')
    }
  }

  componentDidMount () {
    const { dispatch } = this.props
    listener(this.handleConnect)
      .on(LOADING_SCREEN, ({ room }) => {
        dispatch(setCurrentGame(room))
        sessionStorage.setItem('roomId', room.id)
        browserHistory.push(`/${room.id}`)
      })
  }

  handleNameChange (username) {
    me.name = username
    this.setState({ username })
  }

  handleConnect () {
    this.setState({
      connected: true
    })
  }

  render () {
    const { connected, username } = this.state
    const { children } = this.props
    return (
      connected
        ?
          <div>
            {
              (username && React.cloneElement(children, { username, onNameChange: this.handleNameChange })) ||
              (<Name onNameChange={this.handleNameChange} />)
            }
          </div>
        : null
    )
  }
}

Home.propTypes = {
  children: PropTypes.node.isRequired,
  dispatch: PropTypes.func.isRequired
}

export default connect()(Home)
