import { register } from '../sockets'

class Player {
  constructor () {
    this.name = ''
    this.registered = false
    this.ownedHexIds = []
    this.ownedCastles = []
  }

  // register (hexId) {
  //   if (!this.registered) {
  //     register(this.name, hexId)
  //   }
  // }
}

export default new Player()
