import React, { Component, PropTypes } from 'react'

import { preload } from '../../../../scripts/index'
import { mapLoaded } from '../../../../scripts/sockets'

import style from './Loading.scss'

class Loading extends Component {
  componentDidMount () {
    const { game } = this.props
    preload()
      .then(() => {
        mapLoaded(game.roomId)
      })
  }

  render () {
    const { game } = this.props
    return (
      <div>
        <div className={style.container}>
          {
            game.players.map(player => (
              <div key={player.username} className={style.arms} style={{ backgroundColor: `#${player.color}` }}>
                <div className={style.player}>
                  <span>{player.username}</span>
                  <span>{player.status}</span>
                </div>
              </div>
            ))
          }
        </div>
        <div className={style.vs}>
          vs.
        </div>
      </div>
    )
  }
}

Loading.propTypes = {
  game: PropTypes.object.isRequired
}

export default Loading
