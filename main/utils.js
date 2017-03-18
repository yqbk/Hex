const xs = require('xstream').default

const randomColor = () => (Math.floor(Math.random() * 16777215) + 1).toString(16)

const combine = (...streams) => {
  let store = streams.map(() => undefined)
  const result$ = xs.merge(...(streams.map((stream, id) => stream.map(value => ({ id, value })))))
  return xs.create({
    start: (listener) => {
      result$.addListener({
        next: (data) => {
          const { id, value } = data
          store[id] = value
          if (!store.filter(v => v === undefined).length) {
            listener.next(store)
            store = streams.map(() => undefined)
          }
        },
        error: () => {},
        complete: () => {}
      })
    },
    stop: () => {}
  })
}

module.exports = {
  randomColor,
  combine
}
