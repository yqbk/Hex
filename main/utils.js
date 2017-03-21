const xs = require('xstream').default

const randomColor = () => (Math.floor(Math.random() * 16777215) + 1).toString(16)

const accept = (s$, types) => s$.filter(v => types.includes(v.type)).map(v => v.payload)

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

module.exports = {
  randomColor,
  accept,
  combine
}
