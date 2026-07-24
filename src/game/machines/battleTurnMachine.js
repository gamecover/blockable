import { setup } from 'xstate'

export const battleTurnMachine = setup({}).createMachine({
  id: 'battleTurn',
  initial: 'playerInput',
  states: {
    playerInput: { on: { END_TURN: 'resolving', DEBUG_WIN: 'victory' } },
    resolving: { on: { PLAYER_DONE: 'monsterAction', MONSTER_DEFEATED: 'victory', DEBUG_WIN: 'victory' } },
    monsterAction: { on: { MONSTER_DONE: 'nextTurn', PLAYER_DEFEATED: 'defeat' } },
    nextTurn: { on: { READY: 'playerInput' } },
    victory: { type: 'final' },
    defeat: { type: 'final' },
  },
})
