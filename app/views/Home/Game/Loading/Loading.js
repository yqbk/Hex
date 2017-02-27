import React, { PropTypes } from 'react'

import style from './Loading.scss'

function Loading ({ game }) {
  return (
    <div>
    <div className={style.container}>
      {
        game.players.map(player => (
          <div className={style.arms}>
            <div className={style.player} key={player.username}>
              <span>{player.username}</span>
              <span>{player.status}</span>
            </div>
          </div>
        ))
      }

    </div>
    <div className={style.vs}>vs.</div>
    </div>
  )
}

Loading.propTypes = {
  game: PropTypes.object.isRequired
}

export default Loading
