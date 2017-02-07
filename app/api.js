import axios from 'axios'

const baseURL = 'http://localhost:5000'

export const register = params => axios(`${baseURL}/register`, { params })
  .then((response) => {
    localStorage.setItem('id', response.data) // eslint-disable-line
    return true
  })
  .catch(() => false)
