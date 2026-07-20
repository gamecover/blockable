import { setup } from 'xstate'

export const battleTurnMachine = setup({}).createMachine({
  id: 'battleTurn',
  initial: 'playerInput',
  states: {
    playerInput: { on: { END_TURN: 'resolving' } },
    resolving: { on: { PLAYER_DONE: 'monsterAction', MONSTER_DEFEATED: 'victory' } },
    monsterAction: { on: { MONSTER_DONE: 'nextTurn', PLAYER_DEFEATED: 'defeat' } },
    nextTurn: { on: { READY: 'playerInput' } },
    victory: { type: 'final' },
    defeat: { type: 'final' },
  },
})
