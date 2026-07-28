import { setup } from 'xstate'

export const battleTurnMachine = setup({}).createMachine({
  id: 'battleTurn',
  initial: 'playerInput',
  states: {
    playerInput: { on: { END_TURN: 'resolving', DEBUG_WIN: 'victory' } },
    resolving: { on: { PLAYER_DONE: 'monsterAction', PLAYER_EXTRA: 'turnEnd', MONSTER_DEFEATED: 'victory', DEBUG_WIN: 'victory' } },
    monsterAction: { on: { MONSTER_DONE: 'nextTurn', PLAYER_DEFEATED: 'defeat' } },
    turnEnd: { on: { TURN_ENDED: 'nextTurn', PLAYER_DEFEATED: 'defeat', MONSTER_DEFEATED: 'victory' } },
    nextTurn: { on: { READY: 'playerInput' } },
    victory: { type: 'final' },
    defeat: { type: 'final' },
  },
})
