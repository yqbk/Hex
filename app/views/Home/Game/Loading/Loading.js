import React, { PropTypes } from 'react'

function Loading ({ game }) {
  return (
    <div>
      {
        game.players.map(player => (
          <div key={player.username}><span>{player.username}</span> <span>{player.status}</span></div>
        ))
      }
    </div>
  )
}

Loading.propTypes = {
  game: PropTypes.object.isRequired
}

export default Loading
