import { NOTIFY, DELETE_NOTIFICATION } from './actions'

const initialState = {
  messageQueue: []
}

export default function reducer (state = initialState, action) {
  switch (action.type) {
    case NOTIFY:
      return {
        ...state,
        messageQueue: [
          {
            id: action.payload.id,
            message: action.payload.message
          },
          ...state.messageQueue
        ]
      }
    case DELETE_NOTIFICATION:
      return {
        ...state,
        messageQueue: state.messageQueue.filter(item => item.id !== action.payload.id)
      }
    default:
      return state
  }
}
