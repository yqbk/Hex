import React, { Component, PropTypes } from 'react'

import style from './Loading.scss'

class Loading extends Component {
  componentDidMount () {
  }

  render () {
    const { game } = this.props
    return (
      <div style={{ width: '100vw', height: '100vh', backgroundColor: 'white' }}>
        <div className={style.container}>
          {
            Object.keys(game.players).map(id => (
              <div
                key={`${game.players[id].username}-${id}`}
                className={style.arms}
                style={{ backgroundColor: `#${game.players[id].color}` }}
              >
                <div className={style.player}>
                  <span>{game.players[id].username}</span>
                  <span>{game.players[id].status}</span>
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
