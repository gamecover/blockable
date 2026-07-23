import { rotateBlockCells } from '../../systems/boardPlacementSystem.js'

const layoutBlock = (block, rotation, metrics) => {
  const shapeCells = rotateBlockCells(block.cells, rotation)
  const maxColumn = Math.max(...shapeCells.map(([column]) => column))
  const maxRow = Math.max(...shapeCells.map(([, row]) => row))
  const anchorX = maxColumn * metrics.cellSize / 2
  const anchorY = maxRow * metrics.cellSize / 2
  const cells = shapeCells.map(([column, row]) => ({
    column, row,
    x: column * metrics.cellSize - anchorX,
    y: row * metrics.cellSize - anchorY,
    size: metrics.cellSize - metrics.gap,
  }))
  return {
    cells,
    cellSize: metrics.cellSize,
    width: (maxColumn + 1) * metrics.cellSize,
    height: (maxRow + 1) * metrics.cellSize,
    anchorX,
    anchorY,
  }
}

export const layoutBlockForHand = (block, rotation, metrics) => layoutBlock(block, rotation, metrics)
export const layoutBlockForBoard = (block, rotation, metrics) => layoutBlock(block, rotation, metrics)
export const getBlockAnchorOffset = (layout) => ({ x: layout.anchorX, y: layout.anchorY })
export const getBlockVisualBounds = (layout) => {
  const left = Math.min(...layout.cells.map(({ x, size }) => x - size / 2))
  const right = Math.max(...layout.cells.map(({ x, size }) => x + size / 2))
  const top = Math.min(...layout.cells.map(({ y, size }) => y - size / 2))
  const bottom = Math.max(...layout.cells.map(({ y, size }) => y + size / 2))
  return { x: left, y: top, width: right - left, height: bottom - top }
}
export const isPointInsideBlock = (layout, localX, localY) => layout.cells.some(({ x, y, size }) => (
  localX >= x - size / 2
  && localX <= x + size / 2
  && localY >= y - size / 2
  && localY <= y + size / 2
))
export const gridToWorld = (row, column, metrics) => ({ x: metrics.originX + column * metrics.cellSize, y: metrics.originY + row * metrics.cellSize })
export const worldToGrid = (x, y, metrics) => ({ column: Math.round((x - metrics.originX) / metrics.cellSize), row: Math.round((y - metrics.originY) / metrics.cellSize) })
