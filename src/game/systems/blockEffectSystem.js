import {
  conditionMatches,
  findMatchingCombinations,
  getCombinationEffectStages,
} from './blockCombinationSystem.js'

const ADDITIVE_EFFECTS = {
  gain_block: { resultKey: 'armor', parameter: 'amount' },
  heal: { resultKey: 'healing', parameter: 'amount' },
  draw_block: { resultKey: 'drawCount', parameter: 'count' },
  gain_gold: { resultKey: 'gold', parameter: 'amount' },
}

const normalizeEffect = (effect) => {
  const parameters = effect.parameters ?? {}
  const type = effect.type?.toUpperCase()
  return {
    ...effect,
    type,
    target: effect.target ?? parameters.target,
    value: Number(effect.value ?? parameters.amount ?? parameters.count ?? 0),
    parameters,
  }
}

const effectLabel = (effect) => {
  const parameters = effect.parameters ?? {}
  switch (effect.effect_id) {
    case 'deal_damage': return `피해 ${parameters.amount}`
    case 'gain_block': return `방어 ${parameters.amount}`
    case 'heal': return `회복 ${parameters.amount}`
    case 'draw_block': return `추가 드로우 ${parameters.count}`
    case 'gain_gold': return `골드 ${parameters.amount}`
    case 'apply_status': return `${parameters.status_name ?? parameters.status_id} ${parameters.stacks ?? 1}`
    case 'apply_buff': return `${parameters.buff_name ?? parameters.buff_id}`
    case 'modify_next_effect': return `다음 효과 ×${parameters.multiplier}`
    default: return effect.effect_id
  }
}

export const resolveBlockEffects = (placedBlocks) => {
  const matches = findMatchingCombinations(placedBlocks)
  const blockEffects = placedBlocks.flatMap(({ block }) => block.effects ?? [])
  const combinationStages = getCombinationEffectStages(matches)
  const independentEffects = [
    combinationStages.recipeEffects,
    combinationStages.conditionalEffects,
    combinationStages.synergyEffects,
  ].flatMap((stage) => [...stage].sort((left, right) => left.order - right.order))
  const result = {
    damage: 0,
    damageByTarget: { enemy: 0, allEnemies: 0 },
    damageEffects: [],
    baseDamageEffects: [],
    independentDamageEffects: [],
    armor: 0,
    healing: 0,
    drawCount: 0,
    gold: 0,
    extraTurns: 0,
    statuses: [],
    operations: [],
    combinations: matches.map(({ combination }) => combination.id),
    combinationDetails: matches.map(({ combination, participatingBlocks }) => {
      const conditionalEffects = combination.conditional_effects.flatMap((entry) =>
        conditionMatches(entry.condition, participatingBlocks) ? entry.effects : [])
      const appliedEffects = [...combination.effects, ...conditionalEffects]
        .sort((left, right) => left.order - right.order)
      return {
        id: combination.id,
        name: combination.display_name,
        effects: appliedEffects.map(effectLabel),
      }
    }),
  }
  result.hitCountModifier = 0
  result.playerStatuses = []
  const addEffect = (rawEffect, fallbackDamageKind) => {
    const effect = normalizeEffect(rawEffect)
    const isDamage = effect.effect_id === 'deal_damage'
      || ['BASE_DAMAGE', 'INDEPENDENT_DAMAGE'].includes(effect.type)
    if (isDamage) {
      const amount = effect.value
      const range = effect.parameters.range ?? 'single'
      const damageKind = effect.type === 'BASE_DAMAGE'
        ? 'baseDamageEffects'
        : effect.type === 'INDEPENDENT_DAMAGE'
          ? 'independentDamageEffects'
          : fallbackDamageKind
      const damageEffect = {
        target: effect.target ?? 'enemy',
        range,
        distance: Number(effect.parameters.distance ?? (range === 'single' ? 0 : 1)),
        amount,
      }
      result.damage += amount
      result.damageEffects.push(damageEffect)
      result[damageKind].push(damageEffect)
      if (range === 'all') {
        result.damageByTarget.allEnemies += amount
      } else {
        result.damageByTarget.enemy += amount
      }
      return
    }
    if (effect.type === 'HIT_COUNT') {
      result.hitCountModifier += effect.value
      return
    }
    const typedAdditive = {
      BLOCK: 'armor',
      RECOVERY: 'healing',
      DRAW: 'drawCount',
    }[effect.type]
    if (typedAdditive) {
      result[typedAdditive] += effect.value
      return
    }
    if (effect.type === 'EXTRA_TURN') {
      result.extraTurns += Math.max(0, effect.value || 1)
      return
    }
    const additive = ADDITIVE_EFFECTS[effect.effect_id]
    if (additive) {
      result[additive.resultKey] += Number(effect.parameters[additive.parameter] ?? 0)
      return
    }
    if (effect.effect_id === 'apply_status' || ['DEBUFF', 'CROWD_CONTROL', 'BUFF'].includes(effect.type)) {
      const status = {
        id: effect.reference_id ?? effect.parameters.status_id,
        name: effect.parameters.status_name,
        stacks: Number(effect.parameters.stacks ?? 1),
        duration: effect.parameters.duration ?? null,
      }
      if (effect.target === 'self') result.playerStatuses.push(status)
      else result.statuses.push(status)
      return
    }
    result.operations.push(effect)
  }
  blockEffects.forEach((effect) => addEffect(effect, 'baseDamageEffects'))
  independentEffects.forEach((effect) => addEffect(effect, 'independentDamageEffects'))
  return result
}
