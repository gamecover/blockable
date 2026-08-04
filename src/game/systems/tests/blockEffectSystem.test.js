import { describe, expect, it } from 'vitest'
import { createBlock } from '../../../objects/blocks/blockData.js'
import { conditionMatches } from '../blockCombinationSystem.js'
import {
  describeDamageRange,
  describeFinalBlockEffects,
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

  it('orders the final preview as B, A, range, self buffs, and enemy debuffs', () => {
    expect(describeFinalBlockEffects({
      baseDamageEffects: [{ amount: 18, range: 'all', distance: 0 }],
      independentDamageEffects: [{ amount: 20, range: 'all', distance: 0 }],
      buffs: [{ id: 'rage', target: 'self', stacks: 2 }],
      debuffs: [{ id: 'weakness', target: 'enemy', stacks: 1 }],
      armor: 0,
      healing: 0,
    })).toBe('기본 데미지(B) 18 + 독립 데미지(A) 20  /  범위 전체  /  나의 버프 분노 2  /  적 디버프 약화 1')
  })

  it('shows the resolved B damage after H is applied', () => {
    expect(describeFinalBlockEffects({
      baseDamageEffects: [{ amount: 18, range: 'all', distance: 0 }],
      independentDamageEffects: [{ amount: 45, range: 'all', distance: 0 }],
      buffs: [],
      debuffs: [],
      armor: 0,
      healing: 0,
    }, {
      baseDamage: 54,
      independentDamage: 45,
    })).toBe('기본 데미지(B) 54 + 독립 데미지(A) 45  /  범위 전체')
  })

  it('describes placed colors and prefixes a combination with the dominant non-steel color', () => {
    const combination = BLOCK_RULE_INDEX.combinations.get('base_33_05')
    const fire = { block: createBlock('f001', 'color-fire') }
    const steel = { block: createBlock('s002', 'color-steel') }
    const nature = { block: createBlock('n003', 'color-nature') }

    expect(describePlacedBlockColors([fire, steel, fire])).toBe('화염 2 · 강철 1')
    expect(getColoredCombinationName(combination, [fire, steel]))
      .toBe('화염의 미완성 권총')
    expect(getColoredCombinationName(combination, [nature, fire]))
      .toBe('자연의 미완성 권총')
  })

  it('disables every color synergy when all three synergy colors are present', () => {
    const blocks = [
      { block: createBlock('f001', 'fire-1'), cells: [] },
      { block: createBlock('f002', 'fire-2'), cells: [] },
      { block: createBlock('f003', 'fire-3'), cells: [] },
      { block: createBlock('w001', 'water-1'), cells: [] },
      { block: createBlock('n001', 'nature-1'), cells: [] },
    ]
    blocks.forEach(({ block }) => { block.effects = [] })

    const result = resolveBlockEffects(blocks)

    expect(result.colorSynergy.labels).toEqual([])
    expect(result.colorSynergy.disabledByThreeColors).toBe(true)
    expect(result.baseDamageEffects).toEqual([])
    expect(result.independentDamageEffects).toEqual([])
    expect(result.hitCountModifier).toBe(0)
    expect(result.armor).toBe(0)
    expect(result.healing).toBe(0)
  })

  it('adds a two-color mixed attack bonus to A instead of B', () => {
    const blocks = [
      { block: createBlock('f001', 'fire-mixed'), cells: [] },
      { block: createBlock('w001', 'water-mixed'), cells: [] },
    ]
    blocks.forEach(({ block }) => { block.effects = [] })

    const result = resolveBlockEffects(blocks)

    expect(result.baseDamageEffects).toEqual([])
    expect(result.independentDamageEffects).toEqual([
      { target: 'enemy', range: 'single', distance: 0, amount: 5 },
    ])
    expect(result.armor).toBe(5)
  })

  it('applies all five water tiers to armor and independent damage', () => {
    const blocks = Array.from({ length: 5 }, (_, index) => {
      const block = createBlock('w001', `water-${index}`)
      block.effects = []
      return { block, cells: [] }
    })

    const result = resolveBlockEffects(blocks, { currentArmor: 7 })

    expect(result.armor).toBe(60)
    expect(result.retainArmorNextTurn).toBe(true)
    expect(result.independentDamageEffects).toEqual([
      { target: 'enemy', range: 'single', distance: 0, amount: 67 },
    ])
  })

  it('adds one base hit at each of fire tiers four and five', () => {
    const blocks = Array.from({ length: 5 }, (_, index) => {
      const block = createBlock('f001', `fire-hit-${index}`)
      block.effects = []
      return { block, cells: [] }
    })

    const result = resolveBlockEffects(blocks)

    expect(result.hitCountModifier).toBe(2)
    expect(result.independentDamageEffects).toContainEqual({
      target: 'allEnemies',
      range: 'all',
      distance: 0,
      amount: 30,
    })
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

    expect(result.combinations).toContain('base_33_01')
    expect(result.combinationDetails).toContainEqual({
      id: 'base_33_01',
      name: '작은 의자',
      color: null,
      effects: ['회복 2', '공격력 -5'],
    })
    expect(result.damage).toBe(15)
    expect(result.damageByTarget).toEqual({ enemy: 15, allEnemies: 0 })
    expect(result.damageEffects).toEqual([
      { target: 'enemy', range: 'single', distance: 0, amount: 15 },
    ])
    expect(result.baseDamageEffects).toEqual(result.damageEffects)
    expect(result.independentDamageEffects).toEqual([])
    expect(result.healing).toBe(2)
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
    const placedBlocks = placeRecipe('base_33_03')
    const result = resolveBlockEffects(placedBlocks)

    expect(result.combinations).toContain('base_33_03')
    expect(result.independentDamageEffects).toContainEqual({
      target: 'allEnemies',
      range: 'all',
      distance: 0,
      amount: 15,
    })
    expect(result.damageByTarget).toEqual({ enemy: 0, allEnemies: 15 })
    const action = resolvePlayerAction({
      combatants: [
        { instanceId: 'enemy-1', slotId: 1, currentHealth: 50, armor: 0, statuses: [] },
        { instanceId: 'enemy-2', slotId: 2, currentHealth: 50, armor: 0, statuses: [] },
      ],
      selectedMonsterId: 'enemy-1',
      battleType: 'normal',
      effects: result,
    })
    expect(action.combatants.map(({ currentHealth }) => currentHealth)).toEqual([35, 35])
  })

  it('converts an unmatched block B to one independent packet and ignores its hit-count effect', () => {
    const block = createBlock('s001', 'multi-hit')
    block.effects = [
      {
        effect_id: 'test_multi_hit:base_damage', effect_name: '기본 피해', description: '',
        target: 'SELECTED', value: 7, type: 'BASE_DAMAGE',
        parameters: { id: 'NONE', duration: 0, intensify: 0 },
      },
      {
        effect_id: 'test_multi_hit:hit_count', effect_name: '추가 공격 횟수', description: '',
        target: 'SELECTED', value: 2, type: 'EXTRA',
        parameters: { id: 'HIT_COUNT', duration: 0, intensify: 0 },
      },
    ]
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

    expect(effects.baseDamageEffects).toEqual([])
    expect(effects.independentDamageEffects).toEqual([
      { target: 'enemy', range: 'single', distance: 0, amount: 7 },
    ])
    expect(action.hitCount).toBe(1)
    expect(action.combatants[0].currentHealth).toBe(43)
  })

  it('keeps recipe damage in B and converts an unused block B into a one-hit A packet', () => {
    const placedBlocks = placeRecipe('base_33_05', {
      s001: 'f001',
      s002: 'f002',
    })
    const unusedDefinition = BLOCK_RULE_INDEX.blocks.get('f003')
    placedBlocks.push({
      block: createBlock('f003', 'unused-fire'),
      cells: unusedDefinition.shape.cells.map(({ x, y }) => ({ x: x + 4, y: y + 4 })),
    })

    const effects = resolveBlockEffects(placedBlocks)
    const action = resolvePlayerAction({
      combatants: [
        { instanceId: 'enemy-1', slotId: 1, currentHealth: 120, armor: 0, statuses: [] },
      ],
      selectedMonsterId: 'enemy-1',
      battleType: 'normal',
      effects,
    })

    expect(effects.combinations).toContain('base_33_05')
    expect(effects.baseDamageEffects).toEqual([
      { target: 'allEnemies', range: 'all', distance: 0, amount: 18 },
    ])
    expect(effects.independentDamageEffects).toEqual([
      { target: 'allEnemies', range: 'all', distance: 0, amount: 15 },
      { target: 'allEnemies', range: 'all', distance: 0, amount: 30 },
    ])
    expect(action.hitCount).toBe(3)
    expect(action.damageBySlot.get(1)).toBe(99)
    expect(action.combatants[0].currentHealth).toBe(21)
  })

  it('uses canonical DAMAGE_OVER_TIME value as the 0.5.4 stack count', () => {
    const block = createBlock('s001', 'status-damage')
    block.effects = [{
      effect_id: 'test_burn',
      effect_name: '화상',
      description: '',
      target: 'SELECTED',
      value: 5,
      type: 'DAMAGE_OVER_TIME',
      parameters: { id: 'BURN', duration: 0, intensify: 0 },
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
      stacks: 5,
      value: 5,
      duration: 0,
      intensify: 5,
      target: 'enemy',
      range: 'single',
      distance: 0,
    }])
    expect(action.combatants[0].statuses).toEqual([{
      id: 'burn',
      stacks: 5,
      layers: [{ value: 5, intensify: 5, remainingTurns: null, newlyApplied: true }],
    }])
  })

  it('uses value as the stack count for canonical buffs and debuffs', () => {
    const block = createBlock('s001', 'stack-effects')
    block.effects = [
      {
        effect_id: 'test_rage', effect_name: '분노', description: '', target: 'self',
        value: 3, type: 'BUFF', parameters: { id: 'RAGE', duration: 9, intensify: 8 },
      },
      {
        effect_id: 'test_wound', effect_name: '상처', description: '', target: 'SELECTED',
        value: 2, type: 'DEBUFF', parameters: { id: 'WOUND', duration: 9, intensify: 8 },
      },
    ]
    const effects = resolveBlockEffects([{
      block,
      cells: [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: 2 }],
    }])

    expect(effects.playerStatuses).toContainEqual(expect.objectContaining({ id: 'rage', stacks: 3 }))
    expect(effects.statuses).toContainEqual(expect.objectContaining({ id: 'wound', stacks: 2 }))
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
        type: 'EXTRA',
        parameters: { id: 'TURN', duration: 0, intensify: 0 },
      },
      {
        effect_id: 'test_draw',
        effect_name: '드로우',
        description: '',
        target: 'self',
        value: 3,
        type: 'EXTRA',
        parameters: { id: 'DRAW', duration: 0, intensify: 0 },
      },
      {
        effect_id: 'test_placement',
        effect_name: '추가 배치',
        description: '',
        target: 'self',
        value: 1,
        type: 'EXTRA',
        parameters: { id: 'PLACEMENT', duration: 0, intensify: 0 },
      },
    ]
    const result = resolveBlockEffects([{
      block,
      cells: [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: 2 }],
    }])

    expect(result.extraTurns).toBe(2)
    expect(result.drawCount).toBe(3)
    expect(result.extraTurnChanges[0]).toEqual({ turnId: 'TURN', value: 2 })
    expect(result.placementCountChanges[0]).toEqual({ placementId: 'PLACEMENT', value: 1 })
  })

  it('rejects a legacy EXTRA_TURN effect at dispatch instead of adapting it', () => {
    const block = createBlock('s001', 'current-action-extra-turn')
    block.effects = [{
      effect_id: 'test_current_action_extra_turn',
      effect_name: '추가 턴',
      description: '',
      type: 'EXTRA_TURN',
      value: 1,
      target: 'self',
      parameters: { id: 'CURRENT_ACTION', duration: 0, intensify: 1 },
    }]
    expect(() => resolveBlockEffects([{
      block,
      cells: [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 0, y: 2 }],
    }])).toThrow('이 효과를 실행할 런타임 처리기가 없습니다.')
  })

  it('matches a normal-block recipe by shape even when its participating colors differ', () => {
    const result = resolveBlockEffects(placeRecipe('base_33_01', {
      s001: 'f001',
      s002: 'w002',
    }))

    expect(result.combinations).toContain('base_33_01')
    expect(result.combinationDetails).toContainEqual({
      id: 'base_33_01',
      name: '화염의 작은 의자',
      color: 'fire',
      effects: ['회복 2', '공격력 -5'],
    })
  })

  it('uses one color-independent recipe after geometry succeeds', () => {
    const result = resolveBlockEffects(placeRecipe('base_33_01', {
      s001: 'f001',
      s002: 'w002',
    }))

    expect(result.combinations).toEqual(['base_33_01'])
    expect(result.combinationDetails[0].name).toBe('화염의 작은 의자')
  })
})
