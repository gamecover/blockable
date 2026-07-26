import { describe, expect, it } from 'vitest'
import {
  applyMonsterEvent,
  createMonsterBehavior,
  createMonsterEncounter,
  getSpawnableMonsters,
  monsterDesignDiagnostics,
  resolveMonsterAbility,
  selectMonsterAbility,
} from '../monsterDesignSystem.js'

describe('monster design integration', () => {
  it('난이도와 층 조건으로 출현 몬스터를 선택한다', () => {
    const ids = getSpawnableMonsters({ floor: 1, difficultyTier: 1, gradeId: 'normal' })
      .map(({ id }) => id)
    expect(ids).toContain('ember_slime')
    expect(ids).not.toContain('explosive_soul')
  })

  it('등록된 몬스터 이미지 resource ID를 실제 에셋 URL로 연결한다', () => {
    const slime = getSpawnableMonsters({ floor: 1, difficultyTier: 1, gradeId: 'normal' })
      .find(({ id }) => id === 'ember_slime')
    expect(slime.image_resource_id).toBe('ember_slime_alpha.png')
    expect(createMonsterEncounter(slime).imageUrl).toContain('ember_slime_alpha.png')
    const knight = getSpawnableMonsters({ floor: 1, difficultyTier: 1, gradeId: 'boss' })
      .find(({ id }) => id === 'seething_furnace_knight')
    expect(knight.image_resource_id).toBe('seething_furnace_knight.png')
    expect(createMonsterEncounter(knight).imageUrl).toContain('seething_furnace_knight.png')
  })

  it('strict_sequence의 JSON 순서대로 능력을 고른다', () => {
    const monster = getSpawnableMonsters({ floor: 1, difficultyTier: 1, gradeId: 'normal' })
      .find(({ id }) => id === 'ember_slime')
    const first = selectMonsterAbility(monster, createMonsterBehavior(monster), { turn: 1, monster_hp_ratio: 1 })
    const second = selectMonsterAbility(monster, first.runtime, { turn: 2, monster_hp_ratio: 1 })
    expect(first.ability.id).toBe('basic_attack')
    expect(resolveMonsterAbility(first.ability).playerDamage).toBe(10)
    expect(second.ability.id).toBe('a0001')
  })

  it('JSON 효과를 기존 피해·방어·회복·상태 변수로 합산한다', () => {
    const result = resolveMonsterAbility({
      effects: [
        { effect_id: 'deal_damage', order: 0, parameters: { target: 'player', amount: 5 } },
        { effect_id: 'gain_block', order: 1, parameters: { target: 'self', amount: 10 } },
        { effect_id: 'heal', order: 2, parameters: { target: 'self', amount: 7 } },
        { effect_id: 'apply_status', order: 3, parameters: { target: 'player', status_id: 'bleed', stacks: 2 } },
      ],
    })
    expect(result).toMatchObject({
      playerDamage: 5,
      selfArmor: 10,
      selfHealing: 7,
      playerStatuses: [{ id: 'bleeding', sourceId: 'bleed', stacks: 2 }],
    })
  })

  it('오탈자 상태와 스키마 target 충돌을 숨기지 않는다', () => {
    expect(monsterDesignDiagnostics.errors).toEqual([])
    expect(monsterDesignDiagnostics.warnings.some((warning) => warning.includes('injry'))).toBe(true)
    expect(monsterDesignDiagnostics.warnings.some((warning) => warning.includes('target 옵션에 없는 self'))).toBe(true)
  })

  it('ability_used 즉시 트리거를 JSON 조건에 따라 반환한다', () => {
    const monster = getSpawnableMonsters({ floor: 2, difficultyTier: 2, gradeId: 'normal' })
      .find(({ id }) => id === 'explosive_soul')
    const result = applyMonsterEvent(
      monster,
      createMonsterBehavior(monster),
      'ability_used',
      { turn: 3, monster_hp_ratio: 1 },
    )
    expect(result.immediateAbilities.map(({ id }) => id)).toEqual(['a0006'])
  })
})
