import { NOTIFY, DELETE_NOTIFICATION, SET_CURRENT_GAME } from './actions'

const initialState = {
  messageQueue: [],
  currentGame: {}
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
    case SET_CURRENT_GAME:
      return {
        ...state,
        currentGame: action.payload.currentGame
      }
    default:
      return state
  }
}
