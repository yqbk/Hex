import React, { Component, PropTypes } from 'react'
import { connect } from 'react-redux'
import { browserHistory } from 'react-router'

import Loading from './Loading/Loading'
import Map from './Map/Map'
import WinnerScreen from './WinnerScreen/WinnerScreen'

import listener from '../../../scripts/sockets'
import { UPDATE_GAME } from '../../../scripts/actions'
import { setCurrentGame } from '../../../actions'

class Game extends Component {
  constructor (props) {
    super(props)

    if (!props.game.roomId) {
      browserHistory.push('/')
    }
  }


  componentDidMount () {
    const { dispatch } = this.props
    listener()
      .on(UPDATE_GAME, ({ room }) => {
        dispatch(setCurrentGame(room))
      })
  }

  render () {
    const { game } = this.props
    return (
      game.roomId
        ?
          <div>
            {game.status === 'loading' && <Loading game={game} />}
            <Map {...this.props} />
            {game.winner && <WinnerScreen winner={game.winner} />}
          </div>
        : null
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
