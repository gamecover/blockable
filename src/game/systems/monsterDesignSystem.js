import monsterDesignSource from '../../../docs/references/designs/blockable_monster_design.json?raw'
import {
  getMonsterImageAsset,
  hasMonsterImageAsset,
} from '../../objects/monsters/monsterImageAssets.js'

export const MONSTER_DESIGN_SOURCE_PATH = 'docs/references/designs/blockable_monster_design.json'
export const SUPPORTED_MONSTER_SCHEMA_VERSION = '1.0.0'

const GRADE_ADAPTER = Object.freeze({
  NORMAL: 'normal',
  VETERAN: 'named',
  ELITE: 'named',
  BOSS: 'boss',
})
const SUPPORTED_GRADES = new Set(Object.keys(GRADE_ADAPTER))
const SUPPORTED_EFFECT_TYPES = new Set([
  'BASE_DAMAGE',
  'BASE_HIT_COUNT',
  'INDEPENDENT_DAMAGE',
  'BLOCK',
  'RECOVERY',
  'STATUS_DAMAGE',
  'DEBUFF',
  'CROWD_CONTROL',
  'BUFF',
  'EXTRA_TURN',
  'DECK_CAPACITY',
  'DRAW',
  'PLACEMENT_COUNT',
])
const SUPPORTED_PARAMETER_IDS = new Set([
  'CURRENT_ACTION',
  'ATTACK_REDUCTION',
  'DAMAGE_TAKEN_INCREASE',
  'BLEEDING',
  'BURN',
  'STUN',
  'HIT_COUNT',
])
const STATUS_ADAPTER = Object.freeze({
  ATTACK_REDUCTION: 'weakness',
  DAMAGE_TAKEN_INCREASE: 'wound',
  BLEEDING: 'bleeding',
  BURN: 'burn',
  STUN: 'stun',
  HIT_COUNT: 'double_attack',
})
const SUPPORTED_TARGET = /^(SELECTED|self|all|[LRB]\d+)$/
const SUPPORTED_STEP_TYPES = new Set(['SKILL', 'RANDOM_CHOICE'])
const SUPPORTED_EVENTS = new Set(['TURN_STARTED', 'MONSTER_HP_CHANGED', 'SKILL_USED'])
const SUPPORTED_OPERATORS = new Set(['EQ', 'NEQ', 'LT', 'LTE', 'GT', 'GTE'])
const SUPPORTED_RESPONSES = new Set(['IMMEDIATE', 'TRANSITION_PHASE'])
const SUPPORTED_CONDITION_IDS = new Set(['TURN', 'MONSTER_HP_RATIO', 'SKILL_ID'])
const EVENT_ALIASES = {
  turn_started: 'TURN_STARTED',
  monster_hp_changed: 'MONSTER_HP_CHANGED',
  ability_used: 'SKILL_USED',
  skill_used: 'SKILL_USED',
}

export class MonsterDesignRuntimeError extends Error {
  constructor(stage, details, cause) {
    const detailList = Array.isArray(details) ? details : [details]
    super([
      `[Monster Design ${stage}] ${MONSTER_DESIGN_SOURCE_PATH}`,
      ...detailList.map((detail) => `- ${detail}`),
    ].join('\n'), cause ? { cause } : undefined)
    this.name = 'MonsterDesignRuntimeError'
    this.stage = stage
    this.sourcePath = MONSTER_DESIGN_SOURCE_PATH
    this.details = detailList
  }
}

const duplicateValues = (values) => {
  const seen = new Set()
  return values.filter((value) => {
    if (seen.has(value)) return true
    seen.add(value)
    return false
  })
}

const validateEffect = (effect, location, errors) => {
  if (!effect?.effect_id) errors.push(`${location}.effect_id: 필수 값 누락`)
  if (!effect?.effect_name) errors.push(`${location}.effect_name: 필수 값 누락`)
  if (!SUPPORTED_TARGET.test(effect?.target ?? '')) {
    errors.push(`${location}.target: 지원하지 않는 대상 ${effect?.target ?? '없음'}`)
  }
  const type = effect?.type?.toUpperCase()
  if (!SUPPORTED_EFFECT_TYPES.has(type)) {
    errors.push(`${location}.type: 지원하지 않는 효과 타입 ${effect?.type ?? '없음'}`)
  }
  if (!Number.isInteger(effect?.value)) errors.push(`${location}.value: 정수가 필요합니다.`)
  const parameters = effect?.parameters
  if (!parameters || typeof parameters !== 'object') {
    errors.push(`${location}.parameters: 객체가 필요합니다.`)
    return
  }
  if (!SUPPORTED_PARAMETER_IDS.has(parameters.id)) {
    errors.push(`${location}.parameters.id: 런타임 처리기가 없는 변수 ${parameters.id ?? '없음'}`)
  }
  if (!Number.isInteger(parameters.duration) || parameters.duration < -2) {
    errors.push(`${location}.parameters.duration: -2 이상의 정수가 필요합니다.`)
  }
  if (!Number.isInteger(parameters.intensify) || parameters.intensify < 0) {
    errors.push(`${location}.parameters.intensify: 0 이상의 정수가 필요합니다.`)
  }
  if (type === 'BASE_HIT_COUNT'
    && (parameters.id !== 'CURRENT_ACTION'
      || parameters.duration !== 0
      || parameters.intensify < 1)) {
    errors.push(`${location}: BASE_HIT_COUNT는 CURRENT_ACTION / duration 0 / intensify 1+가 필요합니다.`)
  }
}

export const validateMonsterDesign = (design) => {
  const errors = []
  const warnings = []
  if (!design || typeof design !== 'object' || Array.isArray(design)) {
    return { valid: false, errors: ['최상위 값은 객체여야 합니다.'], warnings }
  }
  if (design.schema_version !== SUPPORTED_MONSTER_SCHEMA_VERSION) {
    errors.push(`schema_version: ${design.schema_version ?? '없음'} (지원: ${SUPPORTED_MONSTER_SCHEMA_VERSION})`)
  }
  if (design.data_type !== 'blockable_monster_design') {
    errors.push(`data_type: ${design.data_type ?? '없음'} (필요: blockable_monster_design)`)
  }
  if (design.metadata?.validation_status === 'invalid') {
    errors.push('metadata.validation_status: invalid')
  }
  if (!Array.isArray(design.monsters)) {
    errors.push('monsters: 배열이 필요합니다.')
    return { valid: false, errors, warnings }
  }

  duplicateValues(design.monsters.map(({ monster_id: id }) => id))
    .forEach((id) => errors.push(`monsters: 중복 monster_id ${id}`))
  design.monsters.forEach((monster, monsterIndex) => {
    const location = `monsters[${monsterIndex}]`
    if (!monster.monster_id) errors.push(`${location}.monster_id: 필수 값 누락`)
    if (!monster.monster_name) errors.push(`${location}.monster_name: 필수 값 누락`)
    if (!SUPPORTED_GRADES.has(monster.grade)) {
      errors.push(`${location}.grade: 지원하지 않는 등급 ${monster.grade ?? '없음'}`)
    }
    if (!Number.isInteger(monster.hp) || monster.hp < 1) {
      errors.push(`${location}.hp: 1 이상의 정수가 필요합니다.`)
    }
    if (!Array.isArray(monster.appearance_condition) || !monster.appearance_condition.length) {
      errors.push(`${location}.appearance_condition: 하나 이상의 조건이 필요합니다.`)
    } else {
      monster.appearance_condition.forEach((condition, conditionIndex) => {
        const conditionLocation = `${location}.appearance_condition[${conditionIndex}]`
        if (!condition.dungeon_id) errors.push(`${conditionLocation}.dungeon_id: 필수 값 누락`)
        if (!Number.isInteger(condition.floor_min) || !Number.isInteger(condition.floor_max)
          || condition.floor_min < 1 || condition.floor_min > condition.floor_max) {
          errors.push(`${conditionLocation}: 올바른 층 범위가 필요합니다.`)
        }
      })
    }
    if (!Array.isArray(monster.skills) || !monster.skills.length) {
      errors.push(`${location}.skills: 하나 이상의 스킬이 필요합니다.`)
      return
    }
    duplicateValues(monster.skills.map(({ skill_id: id }) => id))
      .forEach((id) => errors.push(`${location}.skills: 중복 skill_id ${id}`))
    const skillIds = new Set(monster.skills.map(({ skill_id: id }) => id))
    monster.skills.forEach((skill, skillIndex) => {
      const skillLocation = `${location}.skills[${skillIndex}]`
      if (!skill.skill_id) errors.push(`${skillLocation}.skill_id: 필수 값 누락`)
      if (!Array.isArray(skill.effects) || !skill.effects.length) {
        errors.push(`${skillLocation}.effects: 하나 이상의 효과가 필요합니다.`)
      } else {
        duplicateValues(skill.effects.map(({ effect_id: id }) => id))
          .forEach((id) => errors.push(`${skillLocation}.effects: 중복 effect_id ${id}`))
        skill.effects.forEach((effect, effectIndex) =>
          validateEffect(effect, `${skillLocation}.effects[${effectIndex}]`, errors))
      }
    })

    const behavior = monster.behavior
    if (!behavior || !Array.isArray(behavior.phases) || !behavior.phases.length) {
      errors.push(`${location}.behavior.phases: 하나 이상의 페이즈가 필요합니다.`)
      return
    }
    duplicateValues(behavior.phases.map(({ phase_id: id }) => id))
      .forEach((id) => errors.push(`${location}.behavior.phases: 중복 phase_id ${id}`))
    const phaseIds = new Set(behavior.phases.map(({ phase_id: id }) => id))
    if (!phaseIds.has(behavior.initial_phase_id)) {
      errors.push(`${location}.behavior.initial_phase_id: 없는 페이즈 ${behavior.initial_phase_id}`)
    }
    behavior.phases.forEach((phase, phaseIndex) => {
      const phaseLocation = `${location}.behavior.phases[${phaseIndex}]`
      if (phase.loop?.mode !== 'STRICT_SEQUENCE') {
        errors.push(`${phaseLocation}.loop.mode: 지원하지 않는 모드 ${phase.loop?.mode ?? '없음'}`)
      }
      if (!skillIds.has(phase.loop?.fallback_skill_id)) {
        errors.push(`${phaseLocation}.loop.fallback_skill_id: 없는 스킬 ${phase.loop?.fallback_skill_id}`)
      }
      if (!Array.isArray(phase.loop?.steps) || !phase.loop.steps.length) {
        errors.push(`${phaseLocation}.loop.steps: 하나 이상의 단계가 필요합니다.`)
      } else {
        phase.loop.steps.forEach((step, stepIndex) => {
          const stepLocation = `${phaseLocation}.loop.steps[${stepIndex}]`
          if (!SUPPORTED_STEP_TYPES.has(step.type)) {
            errors.push(`${stepLocation}.type: 지원하지 않는 단계 ${step.type ?? '없음'}`)
          } else if (step.type === 'SKILL' && !skillIds.has(step.skill_id)) {
            errors.push(`${stepLocation}.skill_id: 없는 스킬 ${step.skill_id}`)
          } else if (step.type === 'RANDOM_CHOICE') {
            if (!Array.isArray(step.choices) || !step.choices.length) {
              errors.push(`${stepLocation}.choices: 하나 이상의 선택지가 필요합니다.`)
            } else {
              step.choices.forEach((choice, choiceIndex) => {
                if (!skillIds.has(choice.skill_id)) {
                  errors.push(`${stepLocation}.choices[${choiceIndex}].skill_id: 없는 스킬 ${choice.skill_id}`)
                }
                if (!Number.isFinite(choice.weight) || choice.weight <= 0) {
                  errors.push(`${stepLocation}.choices[${choiceIndex}].weight: 양수가 필요합니다.`)
                }
              })
            }
          }
        })
      }
      duplicateValues((phase.triggers ?? []).map(({ trigger_id: id }) => id))
        .forEach((id) => errors.push(`${phaseLocation}.triggers: 중복 trigger_id ${id}`))
      ;(phase.triggers ?? []).forEach((trigger, triggerIndex) => {
        const triggerLocation = `${phaseLocation}.triggers[${triggerIndex}]`
        if (!SUPPORTED_EVENTS.has(trigger.event_id)) {
          errors.push(`${triggerLocation}.event_id: 지원하지 않는 이벤트 ${trigger.event_id}`)
        }
        if (trigger.condition && !SUPPORTED_OPERATORS.has(trigger.condition.operator)) {
          errors.push(`${triggerLocation}.condition.operator: 지원하지 않는 연산자 ${trigger.condition.operator}`)
        }
        if (trigger.condition && !SUPPORTED_CONDITION_IDS.has(trigger.condition.condition_id)) {
          errors.push(`${triggerLocation}.condition.condition_id: 런타임 처리기가 없는 변수 ${trigger.condition.condition_id}`)
        }
        if (!SUPPORTED_RESPONSES.has(trigger.response?.type)) {
          errors.push(`${triggerLocation}.response.type: 지원하지 않는 반응 ${trigger.response?.type}`)
        }
        if (trigger.response?.type === 'IMMEDIATE' && !skillIds.has(trigger.response.skill_id)) {
          errors.push(`${triggerLocation}.response.skill_id: 없는 스킬 ${trigger.response.skill_id}`)
        }
        if (trigger.response?.type === 'TRANSITION_PHASE'
          && !phaseIds.has(trigger.response.target_phase_id)) {
          errors.push(`${triggerLocation}.response.target_phase_id: 없는 페이즈 ${trigger.response.target_phase_id}`)
        }
        ;['priority', 'cooldown_turns', 'max_triggers_per_turn', 'max_triggers_per_battle']
          .forEach((key) => {
            if (!Number.isInteger(trigger[key]) || (key !== 'priority' && trigger[key] < 0)) {
              errors.push(`${triggerLocation}.${key}: ${key === 'priority' ? '정수' : '0 이상의 정수'}가 필요합니다.`)
            }
          })
      })
    })
    if (!hasMonsterImageAsset(monster.monster_id)) {
      warnings.push(`${location}.monster_id: 연결된 이미지 에셋 없음 (${monster.monster_id})`)
    }
  })
  return { valid: errors.length === 0, errors, warnings }
}

export const parseMonsterDesign = (source = monsterDesignSource) => {
  try {
    return JSON.parse(source)
  } catch (cause) {
    throw new MonsterDesignRuntimeError('PARSE', cause.message, cause)
  }
}

const rawMonsterDesign = parseMonsterDesign()
export const monsterDesignDiagnostics = validateMonsterDesign(rawMonsterDesign)
if (!monsterDesignDiagnostics.valid) {
  throw new MonsterDesignRuntimeError('VALIDATE', monsterDesignDiagnostics.errors)
}

const normalizeEffect = (effect, order) => ({
  ...effect,
  order,
})

const normalizeSkill = (skill) => ({
  id: skill.skill_id,
  display_name: skill.skill_name,
  description: skill.description,
  effects: skill.effects.map(normalizeEffect),
  cooldown_turns: 0,
  availability_condition: null,
  intent: {
    type: skill.effects.some(({ type }) =>
      ['BASE_DAMAGE', 'BASE_HIT_COUNT', 'INDEPENDENT_DAMAGE', 'STATUS_DAMAGE'].includes(type))
      ? 'attack'
      : skill.effects.some(({ type }) => type === 'BLOCK')
        ? 'defend'
        : 'special',
  },
})

const normalizeTrigger = (trigger) => ({
  ...trigger,
  id: trigger.trigger_id,
  event_id: trigger.event_id,
  condition: trigger.condition,
  response: {
    ...trigger.response,
    type: trigger.response.type.toLowerCase(),
    ability_id: trigger.response.skill_id,
  },
})

const normalizeMonster = (monster) => ({
  ...monster,
  id: monster.monster_id,
  display_name: monster.monster_name,
  grade_id: GRADE_ADAPTER[monster.grade],
  stats: { max_hp: monster.hp },
  abilities: monster.skills.map(normalizeSkill),
  behavior: {
    initial_phase_id: monster.behavior.initial_phase_id,
    phases: monster.behavior.phases.map((phase) => ({
      ...phase,
      id: phase.phase_id,
      loop: {
        mode: phase.loop.mode.toLowerCase(),
        fallback_ability_id: phase.loop.fallback_skill_id,
        steps: phase.loop.steps.map((step) => step.type === 'RANDOM_CHOICE'
          ? {
              type: 'random_choice',
              choices: step.choices.map(({ skill_id: id, weight }) => ({ ability_id: id, weight })),
            }
          : { type: 'ability', ability_id: step.skill_id }),
      },
      triggers: phase.triggers.map(normalizeTrigger),
    })),
  },
})

export const monsterDesign = Object.freeze({
  ...rawMonsterDesign,
  monsters: rawMonsterDesign.monsters.map(normalizeMonster),
})

const monsterById = new Map(monsterDesign.monsters.map((monster) => [monster.id, monster]))

const compare = (actual, operator, expected) => {
  const normalized = operator?.toLowerCase()
  if (normalized === 'eq') return actual === expected
  if (normalized === 'neq') return actual !== expected
  if (normalized === 'lt') return actual < expected
  if (normalized === 'lte') return actual <= expected
  if (normalized === 'gt') return actual > expected
  if (normalized === 'gte') return actual >= expected
  return false
}

const getConditionValue = (conditionId, context) => {
  if (!conditionId || !context) return undefined
  if (conditionId in context) return context[conditionId]
  const lowerId = conditionId?.toLowerCase()
  if (lowerId in context) return context[lowerId]
  const aliases = {
    TURN: 'turn',
    MONSTER_HP_RATIO: 'monster_hp_ratio',
    SKILL_ID: 'skill_id',
  }
  return context[aliases[conditionId]]
}

export const evaluateMonsterCondition = (condition, context) => {
  if (!condition) return true
  return compare(getConditionValue(condition.condition_id, context), condition.operator, condition.value)
}

export const getSpawnableMonsters = ({
  floor,
  gradeId,
  dungeonId = 'all',
}) => monsterDesign.monsters.filter((monster) =>
  (!gradeId || monster.grade_id === gradeId)
  && monster.appearance_condition.some((condition) =>
    (condition.dungeon_id === 'all' || condition.dungeon_id === dungeonId)
    && floor >= condition.floor_min
    && floor <= condition.floor_max))

const weightedPick = (choices, random) => {
  const total = choices.reduce((sum, choice) => sum + choice.weight, 0)
  let cursor = random() * total
  for (const choice of choices) {
    cursor -= choice.weight
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
  imageUrl: getMonsterImageAsset(monster.id),
})

export const getMonsterDefinition = (monsterId) => monsterById.get(monsterId) ?? null

export const createMonsterBehavior = (monster) => ({
  phaseId: monster.behavior.initial_phase_id,
  stepByPhase: Object.fromEntries(monster.behavior.phases.map(({ id }) => [id, 0])),
  abilityCooldowns: {},
  triggerCooldowns: {},
  triggerCountsThisTurn: {},
  triggerCounts: {},
  firedOnce: {},
})

const getPhase = (monster, runtime) =>
  monster.behavior.phases.find(({ id }) => id === runtime.phaseId)

export const applyMonsterEvent = (monster, runtime, eventId, context) => {
  const normalizedEventId = EVENT_ALIASES[eventId] ?? eventId
  let next = {
    ...runtime,
    triggerCounts: { ...runtime.triggerCounts },
    triggerCountsThisTurn: { ...runtime.triggerCountsThisTurn },
    triggerCooldowns: { ...runtime.triggerCooldowns },
    firedOnce: { ...runtime.firedOnce },
  }
  const phase = getPhase(monster, next)
  const immediateAbilities = []
  const triggers = phase.triggers
    .map((trigger, index) => ({ trigger, index }))
    .filter(({ trigger }) => trigger.event_id === normalizedEventId)
    .filter(({ trigger }) => evaluateMonsterCondition(trigger.condition, context))
    .filter(({ trigger }) => !trigger.once || !next.firedOnce[trigger.id])
    .filter(({ trigger }) => !(next.triggerCooldowns[trigger.id] > 0))
    .filter(({ trigger }) => !trigger.max_triggers_per_turn
      || (next.triggerCountsThisTurn[trigger.id] ?? 0) < trigger.max_triggers_per_turn)
    .filter(({ trigger }) => !trigger.max_triggers_per_battle
      || (next.triggerCounts[trigger.id] ?? 0) < trigger.max_triggers_per_battle)
    .sort((a, b) => b.trigger.priority - a.trigger.priority || a.index - b.index)
  for (const { trigger } of triggers) {
    next.triggerCounts[trigger.id] = (next.triggerCounts[trigger.id] ?? 0) + 1
    next.triggerCountsThisTurn[trigger.id] = (next.triggerCountsThisTurn[trigger.id] ?? 0) + 1
    next.triggerCooldowns[trigger.id] = trigger.cooldown_turns
    if (trigger.once) next.firedOnce[trigger.id] = true
    if (trigger.response.type === 'transition_phase') {
      next.phaseId = trigger.response.target_phase_id
      next.stepByPhase = { ...next.stepByPhase, [next.phaseId]: 0 }
    }
    if (trigger.response.type === 'immediate') {
      immediateAbilities.push(monster.abilities.find(({ id }) => id === trigger.response.ability_id))
    }
  }
  return { runtime: next, immediateAbilities: immediateAbilities.filter(Boolean) }
}

export const applyMonsterTurnTriggers = (monster, runtime, context) => {
  const cooledRuntime = {
    ...runtime,
    triggerCountsThisTurn: {},
    triggerCooldowns: Object.fromEntries(Object.entries(runtime.triggerCooldowns)
      .map(([id, turns]) => [id, Math.max(0, turns - 1)])),
  }
  return applyMonsterEvent(monster, cooledRuntime, 'TURN_STARTED', context).runtime
}

export const selectMonsterAbility = (monster, runtime, context, random = Math.random) => {
  const phase = getPhase(monster, runtime)
  const stepIndex = runtime.stepByPhase[phase.id] ?? 0
  const step = phase.loop.steps[stepIndex % phase.loop.steps.length]
  const chosenId = step.type === 'random_choice'
    ? weightedPick(step.choices, random)
    : step.ability_id
  const ability = monster.abilities.find(({ id }) => id === chosenId)
    ?? monster.abilities.find(({ id }) => id === phase.loop.fallback_ability_id)
  if (!ability) {
    throw new MonsterDesignRuntimeError('RUNTIME', `${monster.id}.${phase.id}: 실행 가능한 스킬 없음`)
  }
  return {
    ability,
    runtime: {
      ...runtime,
      stepByPhase: { ...runtime.stepByPhase, [phase.id]: stepIndex + 1 },
    },
  }
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
    const type = effect.type?.toUpperCase()
    const target = effect.target
    const value = Number(effect.value)
    const intensify = Number(effect.parameters?.intensify ?? 0)
    if (['BASE_DAMAGE', 'INDEPENDENT_DAMAGE'].includes(type)) {
      result[target === 'self' ? 'selfDamage' : 'playerDamage'] += value
    }
    if (type === 'BASE_HIT_COUNT') {
      result[target === 'self' ? 'selfDamage' : 'playerDamage'] += value * intensify
    }
    if (type === 'RECOVERY' && target === 'self') result.selfHealing += value
    if (type === 'BLOCK' && target === 'self') result.selfArmor += value
    if (['STATUS_DAMAGE', 'DEBUFF', 'CROWD_CONTROL', 'BUFF'].includes(type)) {
      const sourceId = effect.parameters.id
      const mappedStatusId = STATUS_ADAPTER[sourceId]
      const stacks = intensify || value
      if (!mappedStatusId) result.unsupportedStatuses.push(sourceId)
      else result[target === 'self' ? 'selfStatuses' : 'playerStatuses']
        .push({ id: mappedStatusId, sourceId, stacks, value, duration: effect.parameters.duration })
    }
  }
  if (result.unsupportedStatuses.length) {
    throw new MonsterDesignRuntimeError(
      'DISPATCH',
      result.unsupportedStatuses.map((id) => `런타임 처리기가 없는 상태 ${id}`),
    )
  }
  return result
}

export const describeMonsterAbility = (ability) => {
  if (!ability) return { label: '행동 없음', icon: '·', amount: null, indicators: [] }
  const resolved = resolveMonsterAbility(ability)
  const indicators = [
    { kind: 'attack', icon: '⚔', label: '공격', amount: resolved.playerDamage },
    { kind: 'armor', icon: '◆', label: '방어', amount: resolved.selfArmor },
    { kind: 'heal', icon: '✚', label: '회복', amount: resolved.selfHealing },
  ].filter(({ amount }) => amount > 0)
  const primary = indicators[0]
  return {
    label: ability.display_name,
    icon: primary?.icon
      ?? (ability.intent?.type === 'attack' ? '⚔' : ability.intent?.type === 'defend' ? '◆' : '✦'),
    amount: primary?.amount ?? null,
    indicators,
  }
}

export const pickMonsterEncounter = ({ floor, gradeId, random = Math.random }) => {
  const requested = getSpawnableMonsters({ floor, gradeId })
  const fallback = gradeId === 'boss' ? [] : getSpawnableMonsters({ floor, gradeId: 'normal' })
  const pool = requested.length ? requested : fallback
  if (!pool.length) {
    throw new MonsterDesignRuntimeError('RUNTIME', `${floor}층/${gradeId}에 출현 가능한 몬스터가 없습니다.`)
  }
  return createMonsterEncounter(pool[Math.floor(random() * pool.length)])
}
