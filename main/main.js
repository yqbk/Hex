const xs = require('xstream').default
const cycle = require('@cycle/run')
const uuid = require('uuid')

const drivers = require('./drivers')
const utils = require('./utils')
const actions = require('../app/scripts/actions')

const main = (sources) => {
  const playersQueue$ = sources.JOIN_QUEUE
    .filter(({ type }) => type === actions.NEW_PLAYERS_QUEUE)
    .map(v => v.playersQueue)
    .startWith([])

  const joinQueue = utils.combine(sources.WS, playersQueue$)
    .filter(([{ type }]) => type === actions.JOIN_QUEUE)
    .map(([message, playersQueue]) => ({ message, id: message.id || uuid.v4(), playersQueue }))
    .filter(({ id, playersQueue }) => !playersQueue.includes(id))
    .map(({ message, id, playersQueue }) => [
      message,
      { id, username: message.payload.username, color: utils.randomColor() },
      [...playersQueue, id]
    ])

  const ws$ = xs.merge(sources.JOIN_QUEUE)
    .filter(({ type }) => type === actions.SEND)
    .map(({ payload }) => payload)

  const sinks = {
    JOIN_QUEUE: joinQueue,
    WS: ws$
  }
  return sinks
}

const start = (server) => {
  cycle.run(main, {
    WS: drivers.makeWSDriver(server),
    JOIN_QUEUE: drivers.makeJoinQueueDriver()
  })
}

module.exports = {
  start
}
