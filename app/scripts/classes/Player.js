class Player {
  constructor () {
    this.name = ''
    this.registered = false
    this.ownedHexIds = []
    this.ownedCastles = []
  }

  defaults () {
    this.ownedHexIds = []
    this.ownedCastles = []
  }
}

export default new Player()
