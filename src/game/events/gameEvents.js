export const GAME_EVENTS = {
  BOARD_CHANGED: 'board:changed',
  TURN_RESOLVED: 'turn:resolved',
  RESET_BOARD: 'board:reset',
}

export class GameEventBridge {
  constructor() { this.target = new EventTarget() }
  emit(type, detail) { this.target.dispatchEvent(new CustomEvent(type, { detail })) }
  on(type, handler) {
    const listener = (event) => handler(event.detail)
    this.target.addEventListener(type, listener)
    return () => this.target.removeEventListener(type, listener)
  }
}

export const gameBridge = new GameEventBridge()
