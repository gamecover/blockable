export const cellKey = ([x, y]) => `${x},${y}`

export const rotateBlockCells = (cells, turns = 0) => {
  let rotated = cells.map(([x, y]) => [x, y])
  for (let turn = 0; turn < turns; turn += 1) rotated = rotated.map(([x, y]) => [-y, x])
  const minX = Math.min(...rotated.map(([x]) => x))
  const minY = Math.min(...rotated.map(([, y]) => y))
  return rotated.map(([x, y]) => [x - minX, y - minY])
}

export const getPlacedCells = (cells, rotation, originX, originY) =>
  rotateBlockCells(cells, rotation).map(([x, y]) => [originX + x, originY + y])

export const canPlaceBlock = ({ cells, activeCellKeys, occupiedCellKeys }) =>
  cells.every((cell) => activeCellKeys.has(cellKey(cell)) && !occupiedCellKeys.has(cellKey(cell)))
