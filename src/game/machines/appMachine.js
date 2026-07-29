import { setup } from 'xstate'

export const appMachine = setup({
  types: { events: {} },
}).createMachine({
  id: 'app',
  initial: 'splash',
  states: {
    splash: { on: { READY: 'menu' } },
    menu: { on: { START: 'prologue', START_CHOICE: 'startChoice', CONTINUE: 'worldMap', CONTINUE_DUNGEON: 'map', CONTINUE_BATTLE: 'battle' } },
    prologue: { on: { CONTINUE: 'startChoice', MENU: 'menu' } },
    worldMap: { on: { ENTER_DUNGEON: 'map', MENU: 'menu' } },
    map: { on: { ENTER_BATTLE: 'battle', ENTER_EVENT: 'event', ENTER_START: 'startChoice', LEAVE_DUNGEON: 'worldMap', MENU: 'menu' } },
    startChoice: { on: { DONE: 'worldMap', DONE_DUNGEON: 'map', MENU: 'menu' } },
    battle: { on: { WIN: 'reward', FLOOR_BOSS_WIN: 'map', DUNGEON_WIN: 'dungeonConquest', BOSS_WIN: 'ending', LOSE: 'gameover', ABANDON: 'map', MENU: 'menu' } },
    reward: { on: { DONE: 'map', FLOOR_BOSS_WIN: 'map', DUNGEON_WIN: 'worldMap', BOSS_WIN: 'ending', MENU: 'menu' } },
    event: { on: { DONE: 'map', MENU: 'menu' } },
    dungeonConquest: { on: { CONTINUE: 'worldMap', MENU: 'menu' } },
    gameover: { on: { MENU: 'menu' } },
    ending: { on: { MENU: 'menu' } },
  },
})
