import { createStore, applyMiddleware } from 'redux'
import createLogger from 'redux-logger'
import thunk from 'redux-thunk'

import reducer from './reducers'

const logger = createLogger({
  collapsed: true,
  duration: true,
  timestamp: false
})

export default createStore(reducer, applyMiddleware(thunk))
