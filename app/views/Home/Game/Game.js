import React, { Component, PropTypes } from 'react'
import { connect } from 'react-redux'

import Loading from './Loading/Loading'
import Map from './Map/Map'

import listener from '../../../scripts/sockets'
import { MAP_LOADED } from '../../../scripts/actions'
import { setCurrentGame } from '../../../actions'

class Game extends Component {
  componentDidMount () {
    const { dispatch } = this.props
    listener()
      .on(MAP_LOADED, ({ room }) => {
        dispatch(setCurrentGame(room))
      })
  }

  render () {
    const { game } = this.props
    return (
      <div>
        {
          game.status === 'loading'
            ? <Loading game={game} />
            : <Map />
        }
      </div>
    )
  }
}

Game.propTypes = {
  game: PropTypes.object.isRequired,
  dispatch: PropTypes.func.isRequired
}

function mapStateToProps (state) {
  return {
    game: state.currentGame || {}
  }
}

export default connect(mapStateToProps)(Game)
