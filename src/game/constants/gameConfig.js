export const GAME_TITLE = 'BLOCKABLE!'
export const DEFAULT_DUNGEON = {
  id: 'ashen-forge',
  name: '잿빛 용광로',
  difficulty: 1,
  floorCount: 2,
  nodeStepCount: 5,
}
export const MAX_FLOOR = DEFAULT_DUNGEON.floorCount
export const STARTING_MAX_HEALTH = 75
export const STARTING_GOLD = 50
export const HAND_SIZE = 5
export const PLACEMENTS_PER_TURN = 3
export const BASE_BLOCK_DAMAGE = 10
export const BOARD_CELL_SIZE = 54
export const BOARD_CELL_GAP = 5
export const HAND_BLOCK_CELL_SIZE = 25
export const HAND_BLOCK_CELL_GAP = 2
export const BOARD_CELLS = [
  [0, 0], [1, 0], [2, 0],
  [0, 1], [1, 1], [2, 1],
  [0, 2], [1, 2], [2, 2],
  [-1, 0], [-1, 1], [-1, 2],
  [3, 0], [3, 1], [3, 2],
]

export const BLOCK_SHAPES = {
  I: [[0, 0], [1, 0], [2, 0]],
  O: [[0, 0], [1, 0], [0, 1], [1, 1]],
  L: [[0, 0], [0, 1], [1, 1]],
}

export const MONSTERS = {
  normal: [
    { id: 'cinder', name: '잿불 정령', health: 42, damage: 8, glyph: '♨' },
    { id: 'golem', name: '고철 골렘', health: 55, damage: 10, glyph: '⚙' },
    { id: 'slime', name: '용광 슬라임', health: 48, damage: 9, glyph: '◉' },
  ],
  boss: { id: 'dragon', name: '녹슨 화룡', health: 110, damage: 15, glyph: '♜' },
}
