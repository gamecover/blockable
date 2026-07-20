import { describe, expect, it } from 'vitest'
import { applyDamage, resolvePlayerTurn } from '../battleSystem.js'

describe('battle system', () => {
  it('deals ten damage per placed block', () => {
    expect(resolvePlayerTurn({ placedCount: 3, occupiedCells: 9, totalBoardCells: 15 })).toEqual({ damage: 30, boardComplete: false })
  })
  it('adds a board completion bonus', () => {
    expect(resolvePlayerTurn({ placedCount: 3, occupiedCells: 15, totalBoardCells: 15 })).toEqual({ damage: 50, boardComplete: true })
  })
  it('uses armor before health', () => {
    expect(applyDamage(75, 15, 10)).toEqual({ health: 70, armor: 0 })
  })
})
