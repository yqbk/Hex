export const NOTIFY = 'NOTIFY'
export const DELETE_NOTIFICATION = 'DELETE_NOTIFICATION'

export const notify = (id, message) => ({
  type: NOTIFY,
  payload: {
    id,
    message
  }
})

export const deleteNotification = id => ({
  type: DELETE_NOTIFICATION,
  payload: {
    id
  }
})

export const addToQueue = message => (dispatch) => {
  const id = +new Date()
  dispatch(notify(id, message))
  setTimeout(() => {
    dispatch(deleteNotification(id))
  }, 3000)
}
