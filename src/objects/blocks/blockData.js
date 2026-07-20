import { BLOCK_SHAPES } from '../../game/constants/gameConfig.js'

export const createBlock = (shape, index, color = 'neutral') => ({
  id: `${shape}-${index}-${Math.random().toString(36).slice(2, 7)}`,
  shape,
  color,
  cells: BLOCK_SHAPES[shape],
})

export const createStarterDeck = (choice = 'L') => {
  const shapes = ['I', 'I', 'I', 'I', 'O', 'O', 'O', 'O', 'L', 'L', 'L', 'L', choice]
  return shapes.map((shape, index) => createBlock(shape, index))
}
