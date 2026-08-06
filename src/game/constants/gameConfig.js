export const GAME_TITLE = 'BLOCKABLE!'
export const DEFAULT_DUNGEON = {
  id: 'ashen-forge',
  name: '잿빛 용광로',
  difficulty: 1,
  floorCount: 2,
}
export const MAX_FLOOR = DEFAULT_DUNGEON.floorCount
export const STARTING_MAX_HEALTH = 75
export const STARTING_GOLD = 50
export const HAND_SIZE = 5
export const PLACEMENTS_PER_TURN = 3
export const BOARD_CELL_SIZE = 54
export const BOARD_CELL_GAP = 5
export const HAND_BLOCK_CELL_SIZE = 32
export const HAND_BLOCK_CELL_GAP = 3
export const BOARD_CELLS = [
  [0, 0], [1, 0], [2, 0],
  [0, 1], [1, 1], [2, 1],
  [0, 2], [1, 2], [2, 2],
  [-1, 0], [-1, 1], [-1, 2],
  [3, 0], [3, 1], [3, 2],
  [-1, -1], [0, -1], [1, -1], [2, -1], [3, -1],
  [-1, 3], [0, 3], [1, 3], [2, 3], [3, 3],
]
