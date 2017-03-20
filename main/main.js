const xs = require('xstream').default
const cycle = require('@cycle/run')
const uuid = require('uuid')

const drivers = require('./drivers')
const utils = require('./utils')
const actions = require('../app/scripts/actions')

const main = (sources) => {
  const playersQueue$ = utils
    .accept(xs.merge(sources.JOIN_QUEUE, sources.START_GAME), [actions.ADD_PLAYERS, actions.REMOVE_PLAYERS])
    .fold((acc, { type, ids, number }) => (type === actions.ADD_PLAYERS ? [...acc, ...ids] : acc.slice(number)), [])
    .startWith([])

  const joinQueue$ = utils
    .combine(utils.accept(sources.WS, [actions.JOIN_QUEUE]), playersQueue$)
    .map(([message, playersQueue]) => ({ message, id: message.id || uuid.v4(), playersQueue }))
    .filter(({ id, playersQueue }) => !playersQueue.includes(id))
    .map(({ message, id }) => [message, { id, username: message.payload.username, color: utils.randomColor() }])

  const ws$ = utils.accept(xs.merge(sources.JOIN_QUEUE), [actions.SEND])

  const sinks = {
    JOIN_QUEUE: joinQueue$,
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
