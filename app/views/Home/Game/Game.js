import React, { Component, PropTypes } from 'react'
import { connect } from 'react-redux'

import Loading from './Loading/Loading'

class Game extends Component {
  componentDidMount () {

  }

  render () {
    const { game } = this.props
    return (
      <div>
        {game.loading && <Loading game={game} />}
      </div>
    )
  }
}

Game.propTypes = {
  game: PropTypes.object.isRequired
}

function mapStateToProps (state) {
  return {
    game: state.currentGame || {}
  }
}

export default connect(mapStateToProps)(Game)
