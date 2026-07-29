import { describe, expect, it } from 'vitest'
import { createBlock } from '../../../objects/blocks/blockData.js'
import { conditionMatches } from '../blockCombinationSystem.js'
import {
  describeDamageRange,
  describePlacedBlockColors,
  getColoredCombinationName,
  resolveBlockEffects,
} from '../blockEffectSystem.js'
import { resolvePlayerAction } from '../playerAttackSystem.js'
import { BLOCK_RULE_INDEX, transformCells } from '../blockRulesSystem.js'

const placeRecipe = (combinationId, replacementIds = {}) => {
  const combination = BLOCK_RULE_INDEX.combinations.get(combinationId)
  return combination.instances.map((instance, index) => {
    const definition = BLOCK_RULE_INDEX.blocks.get(instance.block_id)
    const blockId = replacementIds[instance.block_id] ?? instance.block_id
    return {
      block: createBlock(blockId, `${combinationId}-${index}`),
      cells: transformCells(definition.shape.cells, {
        rotation: instance.rotation,
        mirrored: instance.mirrored,
        origin: instance.origin,
      }),
    }
  })
}

describe('block effects and combinations', () => {
  it('describes attack ranges for the forge effect preview', () => {
    expect(describeDamageRange({ range: 'single', distance: 0 })).toBe('단일')
    expect(describeDamageRange({ range: 'left', distance: 1 })).toBe('기준+좌 1')
    expect(describeDamageRange({ range: 'right', distance: 2 })).toBe('기준+우 2')
    expect(describeDamageRange({ range: 'both', distance: 1 })).toBe('기준+좌우 1')
    expect(describeDamageRange({ range: 'all', distance: 0 })).toBe('전체')
  })

  it('describes placed colors and prefixes a combination with the dominant non-steel color', () => {
    const combination = BLOCK_RULE_INDEX.combinations.get('base_33_05_steel')
    const fire = { block: createBlock('f001', 'color-fire') }
    const steel = { block: createBlock('s002', 'color-steel') }
    const nature = { block: createBlock('n003', 'color-nature') }

    expect(describePlacedBlockColors([fire, steel, fire])).toBe('화염 2 · 강철 1')
    expect(getColoredCombinationName(combination, [fire, steel]))
      .toBe('화염의 미완성 권총')
    expect(getColoredCombinationName(combination, [nature, fire]))
      .toBe('자연의 미완성 권총')
  })

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
      color: null,
      effects: ['회복 5'],
    })
    expect(result.damage).toBe(20)
    expect(result.damageByTarget).toEqual({ enemy: 20, allEnemies: 0 })
    expect(result.damageEffects).toEqual([
      { target: 'enemy', range: 'single', distance: 0, amount: 20 },
    ])
    expect(result.baseDamageEffects).toEqual(result.damageEffects)
    expect(result.independentDamageEffects).toEqual([])
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

  it('uses target all as the runtime all-enemy range', () => {
    const placedBlocks = placeRecipe('base_33_03_steel')
    const result = resolveBlockEffects(placedBlocks)

    expect(result.combinations).toContain('base_33_03_steel')
    expect(result.baseDamageEffects).toContainEqual({
      target: 'allEnemies',
      range: 'all',
      distance: 0,
      amount: 40,
    })
    expect(result.damageByTarget).toEqual({ enemy: 0, allEnemies: 40 })
    const action = resolvePlayerAction({
      combatants: [
        { instanceId: 'enemy-1', slotId: 1, currentHealth: 50, armor: 0, statuses: [] },
        { instanceId: 'enemy-2', slotId: 2, currentHealth: 50, armor: 0, statuses: [] },
      ],
      selectedMonsterId: 'enemy-1',
      battleType: 'normal',
      effects: result,
    })
    expect(action.combatants.map(({ currentHealth }) => currentHealth)).toEqual([10, 10])
  })

  it('uses BASE_HIT_COUNT value as per-hit damage and intensify as the total hit count', () => {
    const block = createBlock('s001', 'multi-hit')
    block.effects = [{
      effect_id: 'test_multi_hit',
      effect_name: 'multi_hit',
      description: '',
      target: 'SELECTED',
      value: 7,
      type: 'BASE_HIT_COUNT',
      parameters: { id: 'CURRENT_ACTION', duration: 0, intensify: 3 },
    }]
    const effects = resolveBlockEffects([{
      block,
      cells: [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: 2 }],
    }])
    const action = resolvePlayerAction({
      combatants: [
        { instanceId: 'enemy-1', slotId: 1, currentHealth: 50, armor: 0, statuses: [] },
      ],
      selectedMonsterId: 'enemy-1',
      battleType: 'normal',
      effects,
    })

    expect(effects.baseDamageEffects).toEqual([
      { target: 'enemy', range: 'single', distance: 0, amount: 7 },
    ])
    expect(action.hitCount).toBe(3)
    expect(action.combatants[0].currentHealth).toBe(29)
  })

  it('applies block STATUS_DAMAGE intensify through the shared status runtime', () => {
    const block = createBlock('s001', 'status-damage')
    block.effects = [{
      effect_id: 'test_burn',
      effect_name: '화상',
      description: '',
      target: 'SELECTED',
      value: 5,
      type: 'STATUS_DAMAGE',
      parameters: { id: 'BURN', duration: 0, intensify: 3 },
    }]
    const effects = resolveBlockEffects([{
      block,
      cells: [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: 2 }],
    }])
    const action = resolvePlayerAction({
      combatants: [
        { instanceId: 'enemy-1', slotId: 1, currentHealth: 50, armor: 0, statuses: [] },
      ],
      selectedMonsterId: 'enemy-1',
      battleType: 'normal',
      effects,
    })

    expect(effects.statusDamageEffects).toEqual([{
      id: 'burn',
      sourceId: 'BURN',
      stacks: 3,
      value: 5,
      duration: 0,
      intensify: 3,
      target: 'enemy',
      range: 'single',
      distance: 0,
    }])
    expect(action.combatants[0].statuses).toEqual([{
      id: 'burn',
      stacks: 3,
      layers: [{ value: 5, intensify: 3, remainingTurns: 1, newlyApplied: true }],
    }])
  })

  it('uses value only for immediate turn and placement resource effects', () => {
    const block = createBlock('s001', 'turn-resources')
    block.effects = [
      {
        effect_id: 'test_extra_turn',
        effect_name: '추가 턴',
        description: '',
        target: 'self',
        value: 2,
        type: 'EXTRA_TURN',
        parameters: { id: 'PLAYER_TURN', duration: 99, intensify: 7 },
      },
      {
        effect_id: 'test_draw',
        effect_name: '드로우',
        description: '',
        target: 'self',
        value: 3,
        type: 'DRAW',
        parameters: { id: 'MAIN_DECK', duration: 99, intensify: 7 },
      },
      {
        effect_id: 'test_placement',
        effect_name: '추가 배치',
        description: '',
        target: 'self',
        value: 1,
        type: 'PLACEMENT_COUNT',
        parameters: { id: 'BLOCK_PLACEMENT', duration: 99, intensify: 7 },
      },
    ]
    const result = resolveBlockEffects([{
      block,
      cells: [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: 2 }],
    }])

    expect(result.extraTurns).toBe(2)
    expect(result.drawCount).toBe(3)
    expect(result.extraTurnChanges[0]).toMatchObject({ value: 2, duration: 0, intensify: 1 })
    expect(result.placementCountChanges[0]).toMatchObject({
      value: 1,
      duration: 0,
      intensify: 1,
    })
  })

  it('matches a normal-block recipe by shape even when its participating colors differ', () => {
    const result = resolveBlockEffects(placeRecipe('base_33_01_steel', {
      s001: 'f001',
      s002: 'w002',
    }))

    expect(result.combinations).toContain('base_33_01_steel')
    expect(result.combinationDetails).toContainEqual({
      id: 'base_33_01_steel',
      name: '화염의 의자',
      color: 'fire',
      effects: ['회복 5'],
    })
  })

  it('selects one matching color variant after geometry succeeds', () => {
    const result = resolveBlockEffects(placeRecipe('special_44_02_steel', {
      s001: 'f001',
      s002: 'f002',
    }))

    expect(result.combinations).toContain('special_44_02_fire')
    expect(result.combinations).not.toContain('special_44_02_steel')
    expect(result.combinations).not.toContain('special_44_02_water')
    expect(result.combinationDetails[0].name).toBe('화염의 채찍')
  })
})
