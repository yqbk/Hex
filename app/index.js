import React from 'react'
import ReactDOM from 'react-dom'
import { Provider } from 'react-redux'
import { Router, Route, IndexRoute, browserHistory } from 'react-router'

// import App from './App'
import Home from './views/Home/Home'
import Menu from './views/Home/Menu/Menu'
import Game from './views/Home/Game/Game'

import store from './store'

ReactDOM.render(
  <Provider store={store}>
    <Router history={browserHistory}>
      <Route path="/" component={Home}>
        <IndexRoute component={Menu} />
        <Route path="/:id" component={Game} />
      </Route>
    </Router>
  </Provider>,
  document.getElementById('root')  // eslint-disable-line
)

if (module.hot) {
  module.hot.accept()
}
