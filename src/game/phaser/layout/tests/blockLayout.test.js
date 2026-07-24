import { describe, expect, it } from 'vitest'
import { BLOCK_SHAPES } from '../../../constants/gameConfig.js'
import { getBlockAnchorOffset, getBlockVisualBounds, gridToWorld, isPointInsideBlock, layoutBlockForBoard, layoutBlockForHand, layoutBlocksInCenteredRow, worldToGrid } from '../blockLayout.js'

const board = { originX: 374, originY: 84, cellSize: 54, gap: 5 }
const hand = { cellSize: 34, gap: 3 }
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
    expect(layout.cells.every(({ size }) => size === 31)).toBe(true)
    expect(layout.cells[1].x).toBe(17)
  })

  it('keeps the board anchor offset separate from the centered visual coordinates', () => {
    expect(getBlockAnchorOffset(layoutBlockForBoard(block('I'), 0, board))).toEqual({ x: 54, y: 0 })
    expect(getBlockAnchorOffset(layoutBlockForBoard(block('I'), 1, board))).toEqual({ x: 0, y: 54 })
    expect(getBlockAnchorOffset(layoutBlockForBoard(block('O'), 0, board))).toEqual({ x: 27, y: 27 })
  })

  it.each([
    ['I', 0, { x: -49.5, y: -15.5, width: 99, height: 31 }],
    ['I', 1, { x: -15.5, y: -49.5, width: 31, height: 99 }],
    ['O', 0, { x: -32.5, y: -32.5, width: 65, height: 65 }],
    ['L', 0, { x: -32.5, y: -32.5, width: 65, height: 65 }],
  ])('centers the rendered %s block bounds after rotation %i', (shape, rotation, expected) => {
    expect(getBlockVisualBounds(layoutBlockForHand(block(shape), rotation, hand))).toEqual(expected)
  })

  it('hit-tests the visible cells from the same centered coordinates used for rendering', () => {
    const horizontalI = layoutBlockForHand(block('I'), 0, hand)
    const lBlock = layoutBlockForHand(block('L'), 0, hand)

    expect(isPointInsideBlock(horizontalI, -34, 0)).toBe(true)
    expect(isPointInsideBlock(horizontalI, 0, 0)).toBe(true)
    expect(isPointInsideBlock(horizontalI, 34, 0)).toBe(true)
    expect(isPointInsideBlock(horizontalI, 66, 0)).toBe(false)
    expect(isPointInsideBlock(lBlock, 17, -17)).toBe(false)
    expect(isPointInsideBlock(lBlock, 17, 17)).toBe(true)
  })

  it('converts between grid and world coordinates', () => {
    const world = gridToWorld(2, 3, board)
    expect(worldToGrid(world.x, world.y, board)).toEqual({ column: 3, row: 2 })
  })

  it('centers hand blocks with a consistent visual gap', () => {
    const blocks = ['I', 'L', 'O'].map(block)
    const slots = layoutBlocksInCenteredRow(blocks, hand, 820, 51)
    const visualEdges = slots.map(({ x, bounds }) => ({
      left: x + bounds.x,
      right: x + bounds.x + bounds.width,
    }))

    expect(visualEdges[1].left - visualEdges[0].right).toBe(51)
    expect(visualEdges[2].left - visualEdges[1].right).toBe(51)
    expect(visualEdges[0].left).toBe(820 - visualEdges[2].right)
  })
})
