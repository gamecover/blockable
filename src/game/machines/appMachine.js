import { setup } from 'xstate'

export const appMachine = setup({
  types: { events: {} },
}).createMachine({
  id: 'app',
  initial: 'splash',
  states: {
    splash: { on: { READY: 'menu' } },
    menu: { on: { START: 'prologue', CONTINUE: 'map', CONTINUE_BATTLE: 'battle' } },
    prologue: { on: { CONTINUE: 'map', MENU: 'menu' } },
    map: { on: { ENTER_BATTLE: 'battle', ENTER_EVENT: 'event', ENTER_START: 'startChoice', MENU: 'menu' } },
    startChoice: { on: { DONE: 'map', MENU: 'menu' } },
    battle: { on: { WIN: 'reward', FLOOR_BOSS_WIN: 'map', BOSS_WIN: 'ending', LOSE: 'gameover', ABANDON: 'map', MENU: 'menu' } },
    reward: { on: { DONE: 'map', FLOOR_BOSS_WIN: 'map', BOSS_WIN: 'ending', MENU: 'menu' } },
    event: { on: { DONE: 'map', MENU: 'menu' } },
    gameover: { on: { MENU: 'menu' } },
    ending: { on: { MENU: 'menu' } },
  },
})
