import React, { PropTypes, Component } from 'react'
import { connect } from 'react-redux'
import ReactCSSTransitionGroup from 'react-addons-css-transition-group'

import style from './Notifications.scss'

class Notifications extends Component {
  render () {
    const { messageQueue } = this.props
    const items = messageQueue.map((item, i) => (
      <span key={item.id} className={style.item} style={{ top: i * 20 }}>
        {item.message}
      </span>
    ))

    return (
      <div className={style.container}>
        <ReactCSSTransitionGroup
          transitionName="example"
          transitionEnterTimeout={500}
          transitionLeaveTimeout={500}
        >
          {items}
        </ReactCSSTransitionGroup>
      </div>
    )
  }
}

Notifications.propTypes = {
  messageQueue: PropTypes.array.isRequired
}

const mapStateToProps = state => ({
  messageQueue: state.messageQueue
})

export default connect(mapStateToProps)(Notifications)
