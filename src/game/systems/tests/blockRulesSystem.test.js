import { describe, expect, it } from 'vitest'
import { createStarterDeck, createUniqueBlockChoices } from '../../../objects/blocks/blockData.js'
import {
  BLOCK_RULES,
  BLOCK_RULE_VALIDATION,
  getRuleBlock,
  transformCells,
  validateBlockRules,
} from '../blockRulesSystem.js'

describe('official block rules', () => {
  it('loads and validates schema 1.1.0 from the editor-managed JSON', () => {
    expect(BLOCK_RULES.schema_version).toBe('1.1.0')
    expect(BLOCK_RULE_VALIDATION.valid).toBe(true)
    expect(validateBlockRules().errors).toEqual([])
    expect(getRuleBlock('s001').display_name).toBe('강철_I')
  })

  it('creates twelve fixed steel blocks and all JSON-defined special starting choices', () => {
    const starter = createStarterDeck()
    expect(starter).toHaveLength(12)
    expect(starter.every(({ color }) => color === 'steel')).toBe(true)
    expect(createUniqueBlockChoices().map(({ definitionId }) => definitionId)).toEqual([
      'a001', 'a002', 'a003', 'a004', 'a005', 'a006',
    ])
  })

  it('mirrors, rotates, normalizes, and translates cells in the documented order', () => {
    expect(transformCells(
      [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }],
      { mirrored: true, rotation: 90, origin: { x: 2, y: 3 } },
    )).toEqual([{ x: 3, y: 4 }, { x: 2, y: 4 }, { x: 2, y: 3 }])
  })
})
