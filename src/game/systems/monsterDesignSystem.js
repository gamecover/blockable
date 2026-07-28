import monsterDesign from '../../../docs/references/designs/blockable_monster_design.json'
import { getMonsterImageAsset } from '../../objects/monsters/monsterImageAssets.js'

const SUPPORTED_SCHEMA_VERSION = '1.3.0'
const SUPPORTED_EFFECTS = new Set(['deal_damage', 'heal', 'gain_block', 'apply_status'])
const STATUS_ADAPTER = Object.freeze({
  burn: 'burn',
  bleed: 'bleeding',
  weak: 'weakness',
  injury: 'wound',
  stun: 'stun',
  doubleAttack: 'double_attack',
  rage: 'rage',
  ironclad: 'ironclad',
})

const compare = (actual, operator, expected) => {
  if (operator === 'eq') return actual === expected
  if (operator === 'neq') return actual !== expected
  if (operator === 'lt') return actual < expected
  if (operator === 'lte') return actual <= expected
  if (operator === 'gt') return actual > expected
  if (operator === 'gte') return actual >= expected
  if (operator === 'contains') return Array.isArray(actual) && actual.includes(expected)
  if (operator === 'in') return Array.isArray(expected) && expected.includes(actual)
  return false
}

export const evaluateMonsterCondition = (condition, context) => {
  if (!condition) return true
  if (condition.all) return condition.all.every((entry) => evaluateMonsterCondition(entry, context))
  if (condition.any) return condition.any.some((entry) => evaluateMonsterCondition(entry, context))
  if (condition.not) return !evaluateMonsterCondition(condition.not, context)
  return compare(context[condition.condition_id], condition.operator, condition.value)
}

const validateDesign = (design) => {
  const errors = []
  const warnings = []
  if (design.schema_version !== SUPPORTED_SCHEMA_VERSION) errors.push(`지원하지 않는 몬스터 스키마: ${design.schema_version}`)
  if (design.invalid) errors.push('몬스터 디자인 파일이 invalid 상태입니다.')

  const effectIds = new Set(design.effect_definitions.map(({ id }) => id))
  const gradeIds = new Set(design.monster_grades.map(({ id }) => id))
  const monsterIds = new Set()
  for (const monster of design.monsters) {
    if (!monster.id || monsterIds.has(monster.id)) errors.push(`중복되거나 빈 몬스터 ID: ${monster.id}`)
    monsterIds.add(monster.id)
    if (monster.invalid) errors.push(`${monster.id}: invalid 몬스터`)
    if (!gradeIds.has(monster.grade_id)) errors.push(`${monster.id}: 알 수 없는 등급 ${monster.grade_id}`)
    if (!Number.isInteger(monster.stats?.max_hp) || monster.stats.max_hp <= 0) errors.push(`${monster.id}: max_hp가 올바르지 않습니다.`)

    const abilities = new Map(monster.abilities.map((ability) => [ability.id, ability]))
    for (const ability of monster.abilities) {
      for (const effect of ability.effects) {
        if (!effectIds.has(effect.effect_id) || !SUPPORTED_EFFECTS.has(effect.effect_id)) {
          errors.push(`${monster.id}.${ability.id}: 지원하지 않는 효과 ${effect.effect_id}`)
        }
        if (effect.effect_id === 'apply_status' && !STATUS_ADAPTER[effect.parameters.status_id]) {
          warnings.push(`${monster.id}.${ability.id}: 연결되지 않은 상태 ID ${effect.parameters.status_id}`)
        }
        if (effect.effect_id === 'deal_damage' && effect.parameters.target === 'self') {
          warnings.push(`${monster.id}.${ability.id}: deal_damage 정의의 target 옵션에 없는 self를 사용합니다.`)
        }
      }
    }
    for (const phase of monster.behavior.phases) {
      const references = [
        phase.loop.fallback_ability_id,
        ...phase.loop.steps.flatMap((step) => step.type === 'random_choice'
          ? step.choices.map(({ ability_id: id }) => id)
          : [step.ability_id]),
      ].filter(Boolean)
      for (const abilityId of references) {
        if (!abilities.has(abilityId)) errors.push(`${monster.id}.${phase.id}: 없는 능력 ${abilityId}`)
      }
    }
  }
  return { errors, warnings }
}

export const monsterDesignDiagnostics = validateDesign(monsterDesign)
if (monsterDesignDiagnostics.errors.length) {
  throw new Error(`몬스터 디자인 로드 실패:\n${monsterDesignDiagnostics.errors.join('\n')}`)
}

export const getSpawnableMonsters = ({ floor, difficultyTier, gradeId }) => monsterDesign.monsters.filter((monster) =>
  !monster.invalid
  && (!gradeId || monster.grade_id === gradeId)
  && difficultyTier >= monster.difficulty_tier.min
  && difficultyTier <= monster.difficulty_tier.max
  && evaluateMonsterCondition(monster.spawn_condition, { floor, difficulty_tier: difficultyTier }))

const weightedPick = (choices, random) => {
  const total = choices.reduce((sum, choice) => sum + Math.max(0, choice.weight ?? 0), 0)
  if (!total) return choices[0]?.ability_id
  let cursor = random() * total
  for (const choice of choices) {
    cursor -= Math.max(0, choice.weight ?? 0)
    if (cursor < 0) return choice.ability_id
  }
  return choices.at(-1)?.ability_id
}

export const createMonsterEncounter = (monster) => ({
  id: monster.id,
  designId: monster.id,
  name: monster.display_name,
  grade: monster.grade_id,
  health: monster.stats.max_hp,
  maxHealth: monster.stats.max_hp,
  glyph: monster.grade_id === 'boss' ? '♜' : monster.grade_id === 'named' ? '⚙' : '◉',
  imageUrl: getMonsterImageAsset(monster.image_resource_id),
})

export const getMonsterDefinition = (monsterId) =>
  monsterDesign.monsters.find(({ id }) => id === monsterId) ?? null

export const createMonsterBehavior = (monster) => ({
  phaseId: monster.behavior.initial_phase_id,
  stepByPhase: Object.fromEntries(monster.behavior.phases.map(({ id }) => [id, 0])),
  abilityCooldowns: {},
  triggerCounts: {},
})

const getPhase = (monster, runtime) =>
  monster.behavior.phases.find(({ id }) => id === runtime.phaseId) ?? monster.behavior.phases[0]

export const applyMonsterEvent = (monster, runtime, eventId, context) => {
  let next = { ...runtime, triggerCounts: { ...runtime.triggerCounts } }
  const phase = getPhase(monster, next)
  const immediateAbilities = []
  const triggers = phase.triggers
    .map((trigger, index) => ({ trigger, index }))
    .filter(({ trigger }) => trigger.event_id === eventId)
    .filter(({ trigger }) => evaluateMonsterCondition(trigger.condition, context))
    .filter(({ trigger }) => !trigger.once || !next.triggerCounts[trigger.id])
    .sort((a, b) => b.trigger.priority - a.trigger.priority || a.index - b.index)
  for (const { trigger } of triggers) {
    next.triggerCounts[trigger.id] = (next.triggerCounts[trigger.id] ?? 0) + 1
    if (trigger.response.type === 'transition_phase') next.phaseId = trigger.response.target_phase_id
    if (trigger.response.type === 'immediate') {
      const ability = monster.abilities.find(({ id }) => id === trigger.response.ability_id)
      if (ability) immediateAbilities.push(ability)
    }
  }
  return { runtime: next, immediateAbilities }
}

export const applyMonsterTurnTriggers = (monster, runtime, context) =>
  applyMonsterEvent(monster, runtime, 'turn_started', context).runtime

export const selectMonsterAbility = (monster, runtime, context, random = Math.random) => {
  const phase = getPhase(monster, runtime)
  const stepIndex = runtime.stepByPhase[phase.id] ?? 0
  const step = phase.loop.steps[stepIndex % Math.max(1, phase.loop.steps.length)]
  const candidates = step?.type === 'random_choice'
    ? step.choices.map(({ ability_id: id, weight }) => ({ id, weight }))
    : [{ id: step?.ability_id ?? phase.loop.fallback_ability_id, weight: 1 }]
  const available = candidates.filter(({ id }) => {
    const ability = monster.abilities.find((entry) => entry.id === id)
    return ability
      && !(runtime.abilityCooldowns[id] > 0)
      && evaluateMonsterCondition(ability.availability_condition, context)
  })
  const chosenId = available.length
    ? weightedPick(available.map(({ id, weight }) => ({ ability_id: id, weight })), random)
    : phase.loop.fallback_ability_id
  const ability = monster.abilities.find(({ id }) => id === chosenId)
  const nextRuntime = {
    ...runtime,
    stepByPhase: { ...runtime.stepByPhase, [phase.id]: stepIndex + 1 },
    abilityCooldowns: Object.fromEntries(Object.entries(runtime.abilityCooldowns)
      .map(([id, turns]) => [id, Math.max(0, turns - 1)])),
  }
  if (ability?.cooldown_turns > 0) nextRuntime.abilityCooldowns[ability.id] = ability.cooldown_turns
  return { ability, runtime: nextRuntime }
}

export const resolveMonsterAbility = (ability) => {
  const result = {
    playerDamage: 0,
    selfDamage: 0,
    selfHealing: 0,
    selfArmor: 0,
    playerStatuses: [],
    selfStatuses: [],
    unsupportedStatuses: [],
  }
  for (const effect of [...(ability?.effects ?? [])].sort((a, b) => a.order - b.order)) {
    const parameters = effect.parameters ?? {}
    const type = effect.type?.toUpperCase()
    const target = effect.target ?? parameters.target
    const amount = Number(effect.value ?? parameters.amount ?? 0)
    const statusId = effect.reference_id ?? parameters.status_id
    const stacks = Number(effect.value ?? parameters.stacks ?? 1)
    if (effect.effect_id === 'deal_damage' || ['BASE_DAMAGE', 'INDEPENDENT_DAMAGE', 'STATUS_DAMAGE'].includes(type)) {
      result[target === 'self' ? 'selfDamage' : 'playerDamage'] += amount
    }
    if ((effect.effect_id === 'heal' || type === 'RECOVERY') && target === 'self') result.selfHealing += amount
    if ((effect.effect_id === 'gain_block' || type === 'BLOCK') && target === 'self') result.selfArmor += amount
    if (effect.effect_id === 'apply_status' || ['DEBUFF', 'CROWD_CONTROL', 'BUFF'].includes(type)) {
      const mappedStatusId = STATUS_ADAPTER[statusId]
      if (!mappedStatusId) result.unsupportedStatuses.push(statusId)
      else result[target === 'self' ? 'selfStatuses' : 'playerStatuses'].push({ id: mappedStatusId, sourceId: statusId, stacks })
    }
  }
  return result
}

export const describeMonsterAbility = (ability) => {
  if (!ability) return { label: '행동 없음', icon: '·', amount: null }
  const damage = ability.effects
    .filter(({ effect_id: id, parameters }) => id === 'deal_damage' && parameters.target === 'player')
    .reduce((sum, { parameters }) => sum + parameters.amount, 0)
  return {
    label: ability.display_name,
    icon: ability.intent?.type === 'attack' ? '⚔' : ability.intent?.type === 'defend' ? '◆' : '✦',
    amount: damage || null,
  }
}

export const pickMonsterEncounter = ({ floor, difficultyTier, gradeId, random = Math.random }) => {
  const requested = getSpawnableMonsters({ floor, difficultyTier, gradeId })
  const fallback = gradeId === 'boss' ? [] : getSpawnableMonsters({ floor, difficultyTier, gradeId: 'normal' })
  const pool = requested.length ? requested : fallback
  if (!pool.length) throw new Error(`${floor}층/난이도 ${difficultyTier}/${gradeId}에 출현 가능한 몬스터가 없습니다.`)
  return createMonsterEncounter(pool[Math.floor(random() * pool.length)])
}

export { monsterDesign }
