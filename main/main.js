const xs = require('xstream').default
const cycle = require('@cycle/run')
const uuid = require('uuid')

const drivers = require('./drivers')
const utils = require('./utils')
const actions = require('../app/scripts/actions')

const main = (sources) => {
  const playersQueue$ = utils
    .accept(xs.merge(sources.JOIN_QUEUE, sources.FIND_ROOM), [actions.ADD_PLAYERS, actions.REMOVE_PLAYERS])
    .fold((acc, { type, ids, number }) => (type === actions.ADD_PLAYERS ? [...acc, ...ids] : acc.slice(number)), [])
    .startWith([])

  const joinQueue$ = utils
    .combine(utils.accept(sources.WS, [actions.JOIN_QUEUE]), playersQueue$)
    .map(([payload, playersQueue]) => ({ payload, id: payload.id || uuid.v4(), playersQueue }))
    .filter(({ id, playersQueue }) => !playersQueue.includes(id))
    .map(({ payload, id }) => [payload, { id, username: payload.username, color: utils.randomColor() }])

  const findRoom$ = playersQueue$
    .filter(playersQueue => playersQueue.length >= 2)
    .map(playersQueue => playersQueue.slice(0, 2))

  const startGame$ = utils
    .accept(sources.FIND_ROOM, [actions.START_GAME])
    .map(({ db, players }) => ({
      id: uuid.v4(),
      players: players.reduce((acc, player) => ({ ...acc, [player.id]: { ...player, status: 'joined' } }), {}),
      status: 'loading',
      db,
      castles: { 20: null, 76: null, 200: null, 88: null, 177: null, 26: null, 98: null }
    }))

  const ws$ = utils.accept(xs.merge(sources.JOIN_QUEUE, sources.START_GAME), [actions.SEND])

  const sinks = {
    JOIN_QUEUE: joinQueue$,
    FIND_ROOM: findRoom$,
    START_GAME: startGame$,
    WS: ws$
  }
  return sinks
}

const start = (server) => {
  cycle.run(main, {
    WS: drivers.makeWSDriver(server),
    JOIN_QUEUE: drivers.makeJoinQueueDriver(),
    FIND_ROOM: drivers.makeFindRoomDriver(),
    START_GAME: drivers.makeStartGameDriver()
  })
}

module.exports = {
  start
}
