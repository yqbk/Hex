const xs = require('xstream').default
const cycle = require('@cycle/run')
const uuid = require('uuid')

const drivers = require('./drivers')
const utils = require('./utils')
const actions = require('../app/scripts/actions')

const main = (sources) => {
  const playerLeft$ = utils.accept(sources.WS, [actions.PLAYER_LEFT])

  const playersQueue$ = utils
    .accept(xs.merge(sources.JOIN_QUEUE, sources.FIND_ROOM, sources.PLAYER_LEFT),
      [actions.ADD_PLAYERS, actions.REMOVE_PLAYERS])
    .fold((acc, { payload: { type, ids } }) => (
      type === actions.ADD_PLAYERS
        ? [...acc, ...ids]
        : acc.filter(id => !ids.includes(id))), []
    )
    .startWith([])

  const joinQueue$ = utils
    .combine(utils.accept(sources.WS, [actions.JOIN_QUEUE]), playersQueue$)
    .map(([{ payload }, playersQueue]) => ({ payload, id: payload.id || uuid.v4(), playersQueue }))
    .filter(({ id, playersQueue }) => !playersQueue.includes(id))
    .map(({ payload, id }) => [payload, { id, username: payload.username, color: utils.randomColor() }])

  const findRoom$ = playersQueue$
    .filter(playersQueue => playersQueue.length >= 2)
    .map(playersQueue => playersQueue.slice(0, 2))

  const createGame$ = utils
    .accept(sources.FIND_ROOM, [actions.START_GAME])
    .map(({ payload: { db, players } }) => ({
      type: actions.START_GAME,
      payload: {
        room: {
          id: uuid.v4(),
          players: players.reduce((acc, player) => ({ ...acc, [player.id]: { ...player, status: 'joined' } }), {}),
          status: 'loading',
          db,
          castles: { 20: null, 76: null, 200: null, 88: null, 177: null, 26: null, 98: null }
        }
      }
    }))

  const getMapRequest$ = utils.accept(sources.WS, [actions.GET_MAP])
  const getMap$ = utils
    .accept(sources.GET_ROOM, [actions.GET_MAP])
    .map(v => v.payload)


  const playerLoadedMapRequest$ = utils.accept(sources.WS, [actions.MAP_LOADED])
  const playerLoadedMap$ = utils
    .accept(sources.GET_ROOM, [actions.MAP_LOADED])
    .map(v => ({ playerId: v.payload.id, room: v.payload.room }))
    .map(({ playerId, room }) => ({
      ...room,
      players: {
        ...room.players,
        [playerId]: {
          ...room.players[playerId],
          status: 'loaded'
        }
      }
    }))
    .map(room => ({
      type: actions.MAP_LOADED,
      payload: {
        room: {
          ...room,
          status: Object.keys(room.players).reduce((acc, id) => acc && room.players[id].status === 'loaded', true)
            ? 'loaded'
            : room.status
        }
      }
    }))
  const playerLoadedMapEmit$ = utils
    .accept(sources.SET_ROOM, [actions.MAP_LOADED])
    .map(v => v.payload.room)
    .map(room => ({
      type: actions.SEND,
      payload: { roomId: room.id, data: { type: actions.UPDATE_GAME, payload: { room } } }
    }))

  const startGame$ = utils
    .accept(sources.SET_ROOM, [actions.START_GAME])
    .map(v => v.payload.room)

  const getRoom$ = xs.merge(getMapRequest$, playerLoadedMapRequest$)
  const setRoom$ = xs.merge(createGame$, playerLoadedMap$)
  const ws$ = utils.accept(xs.merge(
    sources.JOIN_QUEUE,
    sources.START_GAME,
    sources.GET_MAP,
    playerLoadedMapEmit$
  ), [actions.SEND])

  const sinks = {
    PLAYER_LEFT: playerLeft$,
    JOIN_QUEUE: joinQueue$,
    SET_ROOM: setRoom$,
    GET_ROOM: getRoom$,
    GET_MAP: getMap$,
    FIND_ROOM: findRoom$,
    START_GAME: startGame$,
    WS: ws$
  }
  return sinks
}

const start = (server) => {
  cycle.run(main, {
    WS: drivers.makeWSDriver(server),
    PLAYER_LEFT: drivers.makePlayerLeftDriver(),
    JOIN_QUEUE: drivers.makeJoinQueueDriver(),
    SET_ROOM: drivers.makeSetRoomDriver(),
    GET_ROOM: drivers.makeGetRoomDriver(),
    GET_MAP: drivers.makeGetMapDriver(),
    FIND_ROOM: drivers.makeFindRoomDriver(),
    START_GAME: drivers.makeStartGameDriver()
  })
}

module.exports = {
  start
}
