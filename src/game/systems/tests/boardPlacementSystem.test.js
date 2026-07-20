import { describe, expect, it } from 'vitest'
import { canPlaceAnotherBlock, canPlaceBlock, getActiveBoardCellCount, getPlacedCells, rotateBlockCells } from '../boardPlacementSystem.js'

describe('board placement system', () => {
  it('rotates and places blocks using grid coordinates', () => {
    expect(rotateBlockCells([[0, 0], [1, 0], [2, 0]], 1)).toEqual([[0, 0], [0, 1], [0, 2]])
    expect(getPlacedCells([[0, 0], [1, 0]], 0, 2, 1)).toEqual([[2, 1], [3, 1]])
  })

  it('rejects occupied or out-of-board cells', () => {
    const activeCellKeys = new Set(['0,0', '1,0', '2,0'])
    expect(canPlaceBlock({ cells: [[0, 0], [1, 0]], activeCellKeys, occupiedCellKeys: new Set() })).toBe(true)
    expect(canPlaceBlock({ cells: [[0, 0], [1, 0]], activeCellKeys, occupiedCellKeys: new Set(['1,0']) })).toBe(false)
    expect(canPlaceBlock({ cells: [[2, 0], [3, 0]], activeCellKeys, occupiedCellKeys: new Set() })).toBe(false)
  })

  it('removes one cell per five health and keeps the central nine cells', () => {
    expect(getActiveBoardCellCount(75, 15)).toBe(15)
    expect(getActiveBoardCellCount(48, 15)).toBe(10)
    expect(getActiveBoardCellCount(45, 15)).toBe(9)
    expect(getActiveBoardCellCount(20, 15)).toBe(9)
  })

  it('allows no more than three placed blocks', () => {
    expect(canPlaceAnotherBlock(0, 3)).toBe(true)
    expect(canPlaceAnotherBlock(2, 3)).toBe(true)
    expect(canPlaceAnotherBlock(3, 3)).toBe(false)
  })
})
