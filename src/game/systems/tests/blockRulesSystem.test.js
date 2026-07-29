import { describe, expect, it } from 'vitest'
import {
  createBlock,
  createStarterDeck,
  createUniqueBlockChoiceIds,
  createUniqueBlockChoices,
  cycleStandardBlockColor,
} from '../../../objects/blocks/blockData.js'
import {
  BLOCK_RULES,
  BLOCK_RULE_VALIDATION,
  BlockRulesRuntimeError,
  getRuleBlock,
  parseBlockEffectTarget,
  parseBlockRules,
  transformCells,
  validateBlockRules,
} from '../blockRulesSystem.js'

describe('official block rules', () => {
  it('runtime-parses and validates the fixed Designer JSON path', () => {
    expect(BLOCK_RULES.schema_version).toBe('1.1.0')
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
      effects: 5,
      blocks: 28,
      combinations: 45,
      synergies: 0,
    })
    expect(getRuleBlock('s001').display_name).toBe('강철_I')
  })

  it('reports the fixed source path and JSON parser cause for invalid runtime data', () => {
    expect(() => parseBlockRules('{"blocks": [}')).toThrow(BlockRulesRuntimeError)
    expect(() => parseBlockRules('{"blocks": [}')).toThrow(
      expect.objectContaining({
        stage: 'PARSE',
        sourcePath: 'docs/references/designs/blockable_block_design.json',
      }),
    )
  })

  it('rejects a custom effect variable without a runtime handler and reports its location', () => {
    const invalidRules = structuredClone(BLOCK_RULES)
    invalidRules.blocks[0].effects[0].parameters.id = 'CUSTOM_DAMAGE_RULE'
    const result = validateBlockRules(invalidRules)

    expect(result.valid).toBe(false)
    expect(result.errors).toContain(
      'blocks.s001.effects[0].parameters.id: 런타임 처리기가 없는 사용자 정의 변수 CUSTOM_DAMAGE_RULE',
    )
  })

  it('parses the documented self, directional, and all target arguments', () => {
    expect(parseBlockEffectTarget('self')).toEqual({ target: 'self', range: 'single', distance: 0 })
    expect(parseBlockEffectTarget('L1')).toEqual({ target: 'enemy', range: 'left', distance: 1 })
    expect(parseBlockEffectTarget('R2')).toEqual({ target: 'enemy', range: 'right', distance: 2 })
    expect(parseBlockEffectTarget('B1')).toEqual({ target: 'enemy', range: 'both', distance: 1 })
    expect(parseBlockEffectTarget('all')).toEqual({ target: 'allEnemies', range: 'all', distance: 0 })
  })

  it('creates twelve fixed steel blocks and all JSON-defined special starting choices', () => {
    const starter = createStarterDeck()
    expect(starter).toHaveLength(12)
    expect(starter.every(({ color }) => color === 'steel')).toBe(true)
    expect(createUniqueBlockChoices().map(({ definitionId }) => definitionId)).toEqual([
      'a001', 'a002', 'a003', 'a004', 'a005', 'a006',
    ])
  })

  it('offers three distinct random unique blocks for one run-wide choice', () => {
    const choiceIds = createUniqueBlockChoiceIds(3, () => 0)

    expect(choiceIds).toHaveLength(3)
    expect(new Set(choiceIds)).toHaveLength(3)
    expect(createUniqueBlockChoices(choiceIds).map(({ definitionId }) => definitionId))
      .toEqual(choiceIds)
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
