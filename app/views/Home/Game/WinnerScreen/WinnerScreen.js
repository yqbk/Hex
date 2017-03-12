import React, { PropTypes } from 'react'
import { browserHistory } from 'react-router'

import { destroyGame } from '../../../../scripts/index'

import style from './WinnerScreen.scss'

function WinnerScreen ({ winner }) {
  return (
    <div className={style.winner}>
      <div>
        <span>Winner: <b>{winner.username}</b></span>
        <input
          type="button"
          value="Menu"
          onClick={() => {
            destroyGame()
            sessionStorage.removeItem('id')
            sessionStorage.removeItem('roomId')
            browserHistory.push('/')
          }}
        />
      </div>
    </div>
  )
}

WinnerScreen.propTypes = {
  winner: PropTypes.object.isRequired
}

export default WinnerScreen
