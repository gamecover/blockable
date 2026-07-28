import { describe, expect, it } from 'vitest'
import {
  createBlock,
  createStarterDeck,
  createUniqueBlockChoices,
  cycleStandardBlockColor,
} from '../../../objects/blocks/blockData.js'
import {
  BLOCK_RULES,
  BLOCK_RULE_VALIDATION,
  getRuleBlock,
  transformCells,
  validateBlockRules,
} from '../blockRulesSystem.js'

describe('official block rules', () => {
  it('loads and validates schema 1.2.0 from the beta editor-managed JSON', () => {
    expect(BLOCK_RULES.schema_version).toBe('1.2.0')
    expect(BLOCK_RULE_VALIDATION.valid).toBe(true)
    expect(validateBlockRules().errors).toEqual([])
    expect({
      colors: BLOCK_RULES.colors.length,
      blockTypes: BLOCK_RULES.block_types.length,
      effects: BLOCK_RULES.effect_definitions.length,
      blocks: BLOCK_RULES.blocks.length,
      combinations: BLOCK_RULES.combinations.length,
      synergies: BLOCK_RULES.color_synergies.length,
    }).toEqual({
      colors: 7,
      blockTypes: 7,
      effects: 7,
      blocks: 28,
      combinations: 45,
      synergies: 4,
    })
    expect(BLOCK_RULE_VALIDATION.warnings).toEqual(expect.arrayContaining([
      expect.stringContaining('slow'),
      expect.stringContaining('freeze'),
      expect.stringContaining('entangle'),
      expect.stringContaining('reversal'),
      expect.stringContaining('posion'),
    ]))
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

  it('cycles a standard block through developer colors while preserving its instance and shape', () => {
    const steel = createBlock('s002', 'cycle-test')
    const water = cycleStandardBlockColor(steel)
    const nature = cycleStandardBlockColor(water)
    const fire = cycleStandardBlockColor(nature)
    const cycledSteel = cycleStandardBlockColor(fire)

    expect([steel, water, nature, fire, cycledSteel].map(({ color }) => color))
      .toEqual(['steel', 'water', 'nature', 'fire', 'steel'])
    expect([water, nature, fire, cycledSteel].map(({ definitionId }) => definitionId))
      .toEqual(['w002', 'n002', 'f002', 's002'])
    expect([water, nature, fire, cycledSteel].every(({ id, cells }) =>
      id === steel.id && JSON.stringify(cells) === JSON.stringify(steel.cells))).toBe(true)
    expect(cycleStandardBlockColor(createBlock('a001', 'special-test')).definitionId).toBe('a001')
  })

  it('mirrors, rotates, normalizes, and translates cells in the documented order', () => {
    expect(transformCells(
      [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }],
      { mirrored: true, rotation: 90, origin: { x: 2, y: 3 } },
    )).toEqual([{ x: 3, y: 4 }, { x: 2, y: 4 }, { x: 2, y: 3 }])
  })
})
