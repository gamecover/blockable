import { describe, expect, it } from 'vitest'
import { BLOCK_SHAPES } from '../../../constants/gameConfig.js'
import { getBlockAnchorOffset, getBlockVisualBounds, gridToWorld, isPointInsideBlock, layoutBlockForBoard, layoutBlockForHand, worldToGrid } from '../blockLayout.js'

const board = { originX: 374, originY: 84, cellSize: 54, gap: 5 }
const hand = { cellSize: 25, gap: 2 }
const block = (shape) => ({ cells: BLOCK_SHAPES[shape] })

describe('block layout', () => {
  it('lays out horizontal and vertical I blocks on three board cells', () => {
    expect(layoutBlockForBoard(block('I'), 0, board).cells.map(({ x, y, size }) => [x, y, size])).toEqual([[-54, 0, 49], [0, 0, 49], [54, 0, 49]])
    expect(layoutBlockForBoard(block('I'), 1, board).cells.map(({ x, y, size }) => [x, y, size])).toEqual([[0, -54, 49], [0, 0, 49], [0, 54, 49]])
  })

  it.each([['O', 0, 4], ['L', 0, 3], ['L', 1, 3]])('lays out %s rotation %i with board metrics', (shape, rotation, count) => {
    const layout = layoutBlockForBoard(block(shape), rotation, board)
    expect(layout.cells).toHaveLength(count)
    expect(layout.cells.every(({ size }) => size === 49)).toBe(true)
  })

  it('restores the hand metrics', () => {
    const layout = layoutBlockForHand(block('O'), 0, hand)
    expect(layout.cells.every(({ size }) => size === 23)).toBe(true)
    expect(layout.cells[1].x).toBe(12.5)
  })

  it('keeps the board anchor offset separate from the centered visual coordinates', () => {
    expect(getBlockAnchorOffset(layoutBlockForBoard(block('I'), 0, board))).toEqual({ x: 54, y: 0 })
    expect(getBlockAnchorOffset(layoutBlockForBoard(block('I'), 1, board))).toEqual({ x: 0, y: 54 })
    expect(getBlockAnchorOffset(layoutBlockForBoard(block('O'), 0, board))).toEqual({ x: 27, y: 27 })
  })

  it.each([
    ['I', 0, { x: -36.5, y: -11.5, width: 73, height: 23 }],
    ['I', 1, { x: -11.5, y: -36.5, width: 23, height: 73 }],
    ['O', 0, { x: -24, y: -24, width: 48, height: 48 }],
    ['L', 0, { x: -24, y: -24, width: 48, height: 48 }],
  ])('centers the rendered %s block bounds after rotation %i', (shape, rotation, expected) => {
    expect(getBlockVisualBounds(layoutBlockForHand(block(shape), rotation, hand))).toEqual(expected)
  })

  it('hit-tests the visible cells from the same centered coordinates used for rendering', () => {
    const horizontalI = layoutBlockForHand(block('I'), 0, hand)
    const lBlock = layoutBlockForHand(block('L'), 0, hand)

    expect(isPointInsideBlock(horizontalI, -25, 0)).toBe(true)
    expect(isPointInsideBlock(horizontalI, 0, 0)).toBe(true)
    expect(isPointInsideBlock(horizontalI, 25, 0)).toBe(true)
    expect(isPointInsideBlock(horizontalI, 50, 0)).toBe(false)
    expect(isPointInsideBlock(lBlock, 12.5, -12.5)).toBe(false)
    expect(isPointInsideBlock(lBlock, 12.5, 12.5)).toBe(true)
  })

  it('converts between grid and world coordinates', () => {
    const world = gridToWorld(2, 3, board)
    expect(worldToGrid(world.x, world.y, board)).toEqual({ column: 3, row: 2 })
  })
})
