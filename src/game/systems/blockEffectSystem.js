import {
  conditionMatches,
  findMatchingCombinations,
  getCombinationEffectStages,
} from './blockCombinationSystem.js'

const ADDITIVE_EFFECTS = {
  deal_damage: { resultKey: 'damage', parameter: 'amount' },
  gain_block: { resultKey: 'armor', parameter: 'count' },
  heal: { resultKey: 'healing', parameter: 'amount' },
  draw_block: { resultKey: 'drawCount', parameter: 'count' },
  gain_gold: { resultKey: 'gold', parameter: 'amount' },
}

const effectLabel = (effect) => {
  const parameters = effect.parameters ?? {}
  switch (effect.effect_id) {
    case 'deal_damage': return `피해 ${parameters.amount}`
    case 'gain_block': return `방어 ${parameters.count}`
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
  const effects = [
    blockEffects,
    combinationStages.recipeEffects,
    combinationStages.conditionalEffects,
    combinationStages.synergyEffects,
  ].flatMap((stage) => [...stage].sort((left, right) => left.order - right.order))
  const result = {
    damage: 0,
    armor: 0,
    healing: 0,
    drawCount: 0,
    gold: 0,
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
  effects.forEach((effect) => {
    const additive = ADDITIVE_EFFECTS[effect.effect_id]
    if (additive) {
      result[additive.resultKey] += Number(effect.parameters[additive.parameter] ?? 0)
      return
    }
    if (effect.effect_id === 'apply_status') {
      result.statuses.push({
        id: effect.parameters.status_id,
        name: effect.parameters.status_name,
        stacks: Number(effect.parameters.stacks ?? 1),
        duration: effect.parameters.duration ?? null,
      })
      return
    }
    result.operations.push(effect)
  })
  return result
}
