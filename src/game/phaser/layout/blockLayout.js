import { rotateBlockCells } from '../../systems/boardPlacementSystem.js'

const layoutBlock = (block, rotation, metrics) => {
  const shapeCells = rotateBlockCells(block.cells, rotation)
  const cells = shapeCells.map(([column, row]) => ({
    column, row,
    x: column * metrics.cellSize,
    y: row * metrics.cellSize,
    size: metrics.cellSize - metrics.gap,
  }))
  return {
    cells,
    cellSize: metrics.cellSize,
    width: (Math.max(...shapeCells.map(([column]) => column)) + 1) * metrics.cellSize,
    height: (Math.max(...shapeCells.map(([, row]) => row)) + 1) * metrics.cellSize,
  }
}

export const layoutBlockForHand = (block, rotation, metrics) => layoutBlock(block, rotation, metrics)
export const layoutBlockForBoard = (block, rotation, metrics) => layoutBlock(block, rotation, metrics)
export const getBlockVisualCenter = (layout) => ({
  x: (layout.width - layout.cellSize) / 2,
  y: (layout.height - layout.cellSize) / 2,
})
export const getBlockHitArea = (layout, minimumCellSpan = 1) => {
  const width = Math.max(layout.width, layout.cellSize * minimumCellSpan)
  const height = Math.max(layout.height, layout.cellSize * minimumCellSpan)
  return {
    x: -width / 2,
    y: -height / 2,
    width,
    height,
  }
}
export const gridToWorld = (row, column, metrics) => ({ x: metrics.originX + column * metrics.cellSize, y: metrics.originY + row * metrics.cellSize })
export const worldToGrid = (x, y, metrics) => ({ column: Math.round((x - metrics.originX) / metrics.cellSize), row: Math.round((y - metrics.originY) / metrics.cellSize) })
