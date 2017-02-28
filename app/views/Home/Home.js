import React, { Component, PropTypes } from 'react'
import { connect } from 'react-redux'
import { browserHistory } from 'react-router'

import Name from '../../components/Name/Name'

import listener from '../../scripts/sockets'
import { LOADING_SCREEN } from '../../scripts/actions'
import { setCurrentGame } from '../../actions'

class Home extends Component {
  constructor () {
    super()

    this.handleNameChange = this.handleNameChange.bind(this)

    this.state = {
      username: sessionStorage.getItem('username')
    }
  }

  componentDidMount () {
    const { dispatch } = this.props
    listener()
      .on(LOADING_SCREEN, ({ room }) => {
        dispatch(setCurrentGame(room))
        browserHistory.push(`/${room.roomId}`)
      })
  }

  handleNameChange (username) {
    this.setState({ username })
  }

  render () {
    const { username } = this.state
    const { children } = this.props
    return (
      <div>
        {
          (username && React.cloneElement(children, { username, onNameChange: this.handleNameChange })) ||
          (<Name onNameChange={this.handleNameChange} />)
        }
      </div>
    )
  }
}

Home.propTypes = {
  children: PropTypes.node.isRequired,
  dispatch: PropTypes.func.isRequired
}

export default connect()(Home)
