import React from 'react'

import style from './WinnerScreen.scss'

function WinnerScreen ({ winner }) {
  return (
    <div className={style.winner}>
      <div>
        <span>Winner: <b>{winner.username}</b></span>
        <input type="button" />
      </div>
    </div>
  )
}

export default WinnerScreen
