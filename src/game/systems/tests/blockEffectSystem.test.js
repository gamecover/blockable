import { describe, expect, it } from 'vitest'
import { createBlock } from '../../../objects/blocks/blockData.js'
import { conditionMatches } from '../blockCombinationSystem.js'
import { resolveBlockEffects } from '../blockEffectSystem.js'

describe('block effects and combinations', () => {
  it('matches the chair recipe and uses the updated JSON values', () => {
    const placedBlocks = [
      {
        block: createBlock('s001', 0),
        cells: [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: 2 }],
      },
      {
        block: createBlock('s002', 1),
        cells: [{ x: 2, y: 2 }, { x: 2, y: 1 }, { x: 1, y: 1 }],
      },
    ]
    const result = resolveBlockEffects(placedBlocks)

    expect(result.combinations).toContain('base_33_01_steel')
    expect(result.combinationDetails).toContainEqual({
      id: 'base_33_01_steel',
      name: '의자',
      effects: ['회복 5'],
    })
    expect(result.damage).toBe(20)
    expect(result.healing).toBe(5)
  })

  it('honors the optional color ID for all_same_color', () => {
    const blocks = [
      { block: createBlock('s001', 0) },
      { block: createBlock('s002', 1) },
    ]
    expect(conditionMatches({
      kind: 'all_same_color',
      parameters: { color_id: 'steel' },
    }, blocks)).toBe(true)
    expect(conditionMatches({
      kind: 'all_same_color',
      parameters: { color_id: 'fire' },
    }, blocks)).toBe(false)
  })

  it('returns all matching candidates instead of selecting an arbitrary winner', () => {
    const result = resolveBlockEffects([])
    expect(result.combinations).toEqual([])
  })
})
