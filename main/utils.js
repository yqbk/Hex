const xs = require('xstream').default

const randomColor = () => (Math.floor(Math.random() * 16777215) + 1).toString(16)

const accept = (s$, types) => s$.filter(v => types.includes(v.type))

const combine = (...streams) => {
  let store = streams.map(() => undefined)
  const result$ = xs.merge(...(streams.map((s$, id) => s$.map(value => ({ id, value })))))
  return xs.create({
    start: (listener) => {
      result$.addListener({
        next: (data) => {
          const { id, value } = data
          store[id] = value
          if (!store.filter(v => v === undefined).length) {
            const next = store.slice()
            store = streams.map(() => undefined)
            listener.next(next)
          }
        },
        error: () => {},
        complete: () => {}
      })
    },
    stop: () => {}
  })
}

const getAvailableRoom = async (client) => {
  const roomDbs = [2]
  for (let i = 0; i < roomDbs.length; i += 1) {
    const [status, dbSize] = await client // eslint-disable-line
      .multi()
      .select(roomDbs[i])
      .dbsize()
      .execAsync()

    if (status === 'OK' && dbSize === 0) {
      return roomDbs[i]
    }
  }

  return null
}

module.exports = {
  randomColor,
  accept,
  combine,
  getAvailableRoom
}
