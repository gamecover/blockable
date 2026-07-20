import { setup } from 'xstate'

export const appMachine = setup({
  types: { events: {} },
}).createMachine({
  id: 'app',
  initial: 'splash',
  states: {
    splash: { on: { READY: 'menu' } },
    menu: { on: { START: 'prologue', CONTINUE: 'map' } },
    prologue: { on: { CONTINUE: 'map' } },
    map: { on: { ENTER_BATTLE: 'battle', ENTER_EVENT: 'event' } },
    battle: { on: { WIN: 'reward', LOSE: 'gameover', ABANDON: 'map' } },
    reward: { on: { DONE: 'map', BOSS_WIN: 'ending' } },
    event: { on: { DONE: 'map' } },
    gameover: { on: { MENU: 'menu' } },
    ending: { on: { MENU: 'menu' } },
  },
})
