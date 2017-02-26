import React, { Component, PropTypes } from 'react'

import Name from '../../components/Name/Name'

class Home extends Component {
  constructor () {
    super()

    this.handleNameChange = this.handleNameChange.bind(this)

    this.state = {
      username: sessionStorage.getItem('username')
    }
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
  children: PropTypes.node.isRequired
}

export default Home
