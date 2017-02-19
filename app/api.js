import axios from 'axios'

import store from './store'
import { addToQueue } from './actions'

export const register = params => axios('/register', { params })
  .then((response) => {
    sessionStorage.setItem('id', response.data)
    return true
  })
  .catch(({ response: { data } }) => {
    store.dispatch(addToQueue(data))
  })

export const getDestination = params => axios('/destination', { params })
  .then(({ data }) => data)
  .catch(() => [])

export const getMap = () => axios('/map')
