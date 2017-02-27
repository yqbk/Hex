import React, { PropTypes } from 'react'

// import minimap from '../../../../../static/images/minimap.svg'
import style from './Loading.scss'

function Loading ({ game }) {
  // todo minimap error
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
    <div className={style.vs}>
       {/*<img src={minimap} alt="minimap" />*/}
      vs.
    </div>
    </div>
  )
}

Loading.propTypes = {
  game: PropTypes.object.isRequired
}

export default Loading
