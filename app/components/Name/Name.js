import React, { Component, PropTypes } from 'react'

import style from '../../views/Home/Menu/Menu.scss'

class Name extends Component {
  constructor () {
    super()

    this.handleChange = this.handleChange.bind(this)
    this.handleOK = this.handleOK.bind(this)
    this.handleKeyDown = this.handleKeyDown.bind(this)

    this.state = {
      name
    }
  }

  handleChange (e) {
    this.state = {
      name: e.currentTarget.value
    }
  }

  handleKeyDown (e) {
    if (e.keyCode === 13) {
      this.handleOK()
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
        <div className={style.background} />
        <div className={style.loginContainer}>
          <div className={style.welcomeContainer}>
            <span>Enter your name</span>
          </div>
          <input className={style.input} onChange={this.handleChange} onKeyDown={this.handleKeyDown} />
          <button className={style.okButton} onClick={this.handleOK}>OK</button>
        </div>
      </div>
    )
  }
}

Name.propTypes = {
  onNameChange: PropTypes.func.isRequired
}

export default Name
