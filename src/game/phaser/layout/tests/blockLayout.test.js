import { describe, expect, it } from 'vitest'
import { BLOCK_SHAPES } from '../../../constants/gameConfig.js'
import { gridToWorld, layoutBlockForBoard, layoutBlockForHand, worldToGrid } from '../blockLayout.js'

const board = { originX: 374, originY: 84, cellSize: 54, gap: 5 }
const hand = { cellSize: 25, gap: 2 }
const block = (shape) => ({ cells: BLOCK_SHAPES[shape] })

describe('block layout', () => {
  it('lays out horizontal and vertical I blocks on three board cells', () => {
    expect(layoutBlockForBoard(block('I'), 0, board).cells.map(({ x, y, size }) => [x, y, size])).toEqual([[0, 0, 49], [54, 0, 49], [108, 0, 49]])
    expect(layoutBlockForBoard(block('I'), 1, board).cells.map(({ x, y, size }) => [x, y, size])).toEqual([[0, 0, 49], [0, 54, 49], [0, 108, 49]])
  })

  it.each([['O', 0, 4], ['L', 0, 3], ['L', 1, 3]])('lays out %s rotation %i with board metrics', (shape, rotation, count) => {
    const layout = layoutBlockForBoard(block(shape), rotation, board)
    expect(layout.cells).toHaveLength(count)
    expect(layout.cells.every(({ size }) => size === 49)).toBe(true)
  })

  it('restores the hand metrics', () => {
    const layout = layoutBlockForHand(block('O'), 0, hand)
    expect(layout.cells.every(({ size }) => size === 23)).toBe(true)
    expect(layout.cells[1].x).toBe(25)
  })

  it('converts between grid and world coordinates', () => {
    const world = gridToWorld(2, 3, board)
    expect(worldToGrid(world.x, world.y, board)).toEqual({ column: 3, row: 2 })
  })
})
