import { describe, expect, it } from 'vitest'
import { createBlock } from '../../../objects/blocks/blockData.js'
import { applyDamage, resolvePlayerTurn } from '../battleSystem.js'

describe('battle system', () => {
  it('adds each block effect and disables synergy when all three colors are present', () => {
    const placedBlocks = [
      { block: createBlock('s001', 0), cells: [{ x: 0, y: 0 }] },
      { block: createBlock('f001', 1), cells: [{ x: 4, y: 0 }] },
      { block: createBlock('w001', 2), cells: [{ x: 8, y: 0 }] },
      { block: createBlock('n001', 3), cells: [{ x: 12, y: 0 }] },
    ]
    expect(resolvePlayerTurn({
      placedBlocks,
      occupiedCells: 12,
      totalBoardCells: 15,
    })).toMatchObject({
      damage: 34,
      armor: 8,
      healing: 5,
      boardComplete: false,
    })
  })
  it('does not invent a board completion value outside the rules JSON', () => {
    expect(resolvePlayerTurn({
      placedBlocks: [],
      occupiedCells: 15,
      totalBoardCells: 15,
    })).toMatchObject({ damage: 0, boardComplete: true })
  })
  it('uses armor before health', () => {
    expect(applyDamage(75, 15, 10)).toEqual({ health: 70, armor: 0 })
  })
})
