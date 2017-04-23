import _ from 'lodash'
import React, { Component, PropTypes } from 'react'

import init, { reset, preload } from '../../../../scripts/index'
import listener, { mapLoaded } from '../../../../scripts/sockets'
import { WINNER } from '../../../../scripts/actions'
import { setCurrentGame } from '../../../../actions'

import me from '../../../../scripts/classes/Player'

class Map extends Component {
  componentDidMount () {
    const { dispatch, game } = this.props
    preload()
      .then(() => {
        init((_.find(game.players, { id: me.id }) || {}).spawnPosition, () => mapLoaded(game.id))
      })

    listener()
      .on(WINNER, ({ room }) => {
        dispatch(setCurrentGame(room))
        reset()
      })
  }

  render () {
    return (
      <div id="map" style={{ color: 0xFFFFFF }} />
    )
  }
}

Map.propTypes = {
  dispatch: PropTypes.func.isRequired,
  game: PropTypes.object.isRequired
}

export default Map
