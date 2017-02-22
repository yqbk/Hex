import { register } from '../sockets'

class Player {
  constructor (name) {
    this.name = name
    this.registered = false
    this.ownedHexIds = []
  }

  register (hexId) {
    if (!this.registered) {
      register(this.name, hexId)
    }
  }
}

export default Player
