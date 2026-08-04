import { describe, expect, it } from 'vitest'
import {
  applyMonsterEvent,
  createMonsterBehavior,
  createMonsterEncounter,
  getSpawnableMonsters,
  MONSTER_DESIGN_SOURCE_PATH,
  MonsterDesignRuntimeError,
  parseMonsterDesign,
  validateMonsterDesign,
  monsterDesign,
  monsterDesignDiagnostics,
  resolveMonsterAbility,
  describeMonsterAbility,
  selectMonsterAbility,
} from '../monsterDesignSystem.js'

describe('monster design integration', () => {
  it('고정 경로의 런타임 JSON을 새 스키마로 읽는다', () => {
    expect(MONSTER_DESIGN_SOURCE_PATH)
      .toBe('docs/references/designs/blockable_monster_design.json')
    expect(monsterDesign.schema_version).toBe('1.0.0')
    expect(monsterDesign.data_type).toBe('blockable_monster_design')
    expect(monsterDesign.monsters).toHaveLength(17)
    expect(monsterDesignDiagnostics.errors).toEqual([])
  })

  it('던전과 층 조건으로 출현 몬스터를 선택한다', () => {
    const ids = getSpawnableMonsters({ floor: 1, dungeonId: 'all', gradeId: 'normal' })
      .map(({ id }) => id)
    expect(ids).toContain('ember_slime')
    expect(ids).not.toContain('explosive_soul')
  })

  it('monster_id를 실제 에셋 URL에 연결하고 미등록 에셋은 대체 표시로 남긴다', () => {
    const slime = getSpawnableMonsters({ floor: 1, gradeId: 'normal' })
      .find(({ id }) => id === 'ember_slime')
    expect(createMonsterEncounter(slime).imageUrl).toContain('ember_slime_alpha.png')
    const knight = monsterDesign.monsters.find(({ id }) => id === 'seething_furnace_knight')
    expect(createMonsterEncounter(knight).imageUrl).toContain('seething_furnace_knight.png')
    const missingAssetMonster = monsterDesign.monsters.find(({ id }) => id === 'hanging_ashes')
    expect(createMonsterEncounter(missingAssetMonster).imageUrl).toBeNull()
  })

  it('strict_sequence의 JSON 순서대로 능력을 고른다', () => {
    const monster = getSpawnableMonsters({ floor: 1, gradeId: 'normal' })
      .find(({ id }) => id === 'ember_slime')
    const first = selectMonsterAbility(monster, createMonsterBehavior(monster), { turn: 1, monster_hp_ratio: 1 })
    const second = selectMonsterAbility(monster, first.runtime, { turn: 2, monster_hp_ratio: 1 })
    expect(first.ability.id).toBe('basic_attack')
    expect(resolveMonsterAbility(first.ability).playerDamage).toBe(5)
    expect(second.ability.id).toBe('a0001')
  })

  it('공통 effect type과 parameters.id를 기존 전투 변수로 연결한다', () => {
    const result = resolveMonsterAbility({
      effects: [
        { type: 'BASE_DAMAGE', target: 'SELECTED', value: 5, order: 0, parameters: { id: 'NONE', duration: 0, intensify: 0 } },
        { type: 'BLOCK', target: 'self', value: 10, order: 1, parameters: { id: 'NONE', duration: 0, intensify: 0 } },
        { type: 'RECOVERY', target: 'self', value: 7, order: 2, parameters: { id: 'NONE', duration: 0, intensify: 0 } },
        { type: 'DAMAGE_OVER_TIME', target: 'SELECTED', value: 2, order: 3, parameters: { id: 'BLEED', duration: 0, intensify: 0 } },
      ],
    })
    expect(result).toMatchObject({
      playerDamage: 5,
      selfArmor: 10,
      selfHealing: 7,
      playerStatuses: [{
        id: 'bleeding',
        sourceId: 'BLEED',
        stacks: 2,
        value: 2,
        duration: 0,
      }],
    })
  })

  it('BASE_DAMAGE와 INDEPENDENT_DAMAGE를 서로 다른 공격 단계로 보존한다', () => {
    const result = resolveMonsterAbility({
      effects: [
        { type: 'BASE_DAMAGE', target: 'SELECTED', value: 7, order: 0, parameters: { id: 'NONE', duration: 0, intensify: 0 } },
        { type: 'INDEPENDENT_DAMAGE', target: 'SELECTED', value: 4, order: 1, parameters: { id: 'NONE', duration: 0, intensify: 0 } },
      ],
    })

    expect(result).toMatchObject({
      playerBaseDamage: 7,
      playerIndependentDamage: 4,
      playerDamage: 11,
    })
  })

  it('preserves monster extra turns and explicitly ignores block-only resources', () => {
    const result = resolveMonsterAbility({
      effects: [
        { type: 'EXTRA', target: 'self', value: 2, order: 0, parameters: { id: 'TURN', duration: 0, intensify: 0 } },
        { type: 'EXTRA', target: 'self', value: 3, order: 1, parameters: { id: 'DRAW', duration: 0, intensify: 0 } },
        { type: 'EXTRA', target: 'self', value: 1, order: 2, parameters: { id: 'PLACEMENT', duration: 0, intensify: 0 } },
      ],
    })

    expect(result.extraTurns).toBe(2)
    expect(result.ignoredBlockResourceEffects).toEqual([
      'DRAW',
      'PLACEMENT',
    ])
  })

  it('공격·방어·회복 행동을 몬스터 머리 위 의도 목록으로 설명한다', () => {
    const description = describeMonsterAbility({
      display_name: '복합 행동',
      effects: [
        { type: 'BASE_DAMAGE', target: 'SELECTED', value: 9, order: 0, parameters: { id: 'NONE', duration: 0, intensify: 0 } },
        { type: 'BLOCK', target: 'self', value: 6, order: 1, parameters: { id: 'NONE', duration: 0, intensify: 0 } },
        { type: 'RECOVERY', target: 'self', value: 4, order: 2, parameters: { id: 'NONE', duration: 0, intensify: 0 } },
      ],
    })

    expect(description.indicators).toEqual([
      { kind: 'attack', icon: '⚔', label: '공격', amount: 9 },
      { kind: 'armor', icon: '◆', label: '방어', amount: 6 },
      { kind: 'heal', icon: '✚', label: '회복', amount: 4 },
    ])
  })

  it('에셋이 없는 monster_id를 정확한 경로 경고로 보고한다', () => {
    expect(monsterDesignDiagnostics.warnings)
      .toContain('monsters[4].monster_id: 연결된 이미지 에셋 없음 (hanging_ashes)')
    expect(monsterDesignDiagnostics.warnings.filter((warning) =>
      warning.includes('연결된 이미지 에셋 없음'))).toHaveLength(10)
    expect(monsterDesignDiagnostics.warnings.some((warning) =>
      warning.includes('DAMAGE_BONUS'))).toBe(false)
  })

  it('구형 전투 효과를 런타임에서 변환하지 않고 검증 오류로 거부한다', () => {
    const invalid = structuredClone(monsterDesign)
    invalid.monsters[0].skills[0].effects[0].type = 'STATUS_DAMAGE'

    const diagnostics = validateMonsterDesign(invalid)
    expect(diagnostics.errors.some((error) =>
      error.includes('지원하지 않는 효과 타입 STATUS_DAMAGE'))).toBe(true)
  })

  it('JSON 문법과 미지원 사용자 정의 변수를 원인과 함께 실패시킨다', () => {
    expect(() => parseMonsterDesign('{')).toThrow(MonsterDesignRuntimeError)
    const invalid = structuredClone(monsterDesign)
    invalid.monsters[0].skills[0].effects[0].parameters.id = 'CUSTOM_DAMAGE'
    const diagnostics = validateMonsterDesign(invalid)
    expect(diagnostics.errors.some((error) =>
      error.includes('monsters[0].skills[0].effects[0].parameters.id')
      && error.includes('CUSTOM_DAMAGE'))).toBe(true)
  })

  it('기존 화면 이벤트 별칭을 새 SKILL_USED 트리거에 연결한다', () => {
    const monster = getSpawnableMonsters({ floor: 2, gradeId: 'normal' })
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
