import React, { Component, PropTypes } from 'react'

import style from './Name.scss'

class Name extends Component {
  constructor () {
    super()

    this.handleChange = this.handleChange.bind(this)
    this.handleOK = this.handleOK.bind(this)

    this.state = {
      name
    }
  }

  handleChange () {
    this.state = {
      name: this.refName.innerHTML
    }
  }

  handleOK () {
    const { onNameChange } = this.props
    const { name } = this.state
    localStorage.setItem('username', name)
    onNameChange(name)
  }

  render () {
    return (
      <div className={style.container}>
        <span>Enter your name</span>
        <div>
        <div ref={(e) => { this.refName = e }} onInput={this.handleChange} contentEditable />
          <button onClick={this.handleOK}>OK</button>
        </div>
      </div>
    )
  }
}

Name.propTypes = {
  onNameChange: PropTypes.func.isRequired
}

export default Name
