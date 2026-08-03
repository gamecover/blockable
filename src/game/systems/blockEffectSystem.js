import {
  conditionMatches,
  findMatchingCombinations,
  getCombinationEffectStages,
} from './blockCombinationSystem.js'
import {
  BLOCK_RULE_INDEX,
  BlockRulesRuntimeError,
  parseBlockEffectTarget,
} from './blockRulesSystem.js'
import { STATUS_EFFECTS, createStatusUpdateFromEffect } from './statusEffectSystem.js'
import { resolveColorSynergy } from './colorSynergySystem.js'

const ADDITIVE_EFFECTS = {
  gain_block: { resultKey: 'armor', parameter: 'amount' },
  heal: { resultKey: 'healing', parameter: 'amount' },
  draw_block: { resultKey: 'drawCount', parameter: 'count' },
  gain_gold: { resultKey: 'gold', parameter: 'amount' },
}
const BLOCK_COLOR_LABELS = {
  steel: '강철',
  fire: '화염',
  nature: '자연',
  water: '물',
  legendary: '전설',
  special: '특수',
  curse: '저주',
}
const BLOCK_COLOR_PREFIXES = {
  fire: '화염의',
  nature: '자연의',
  water: '물의',
}

const normalizeEffect = (effect) => {
  const parameters = effect.parameters ?? {}
  const type = effect.type?.toUpperCase()
  const rawTarget = effect.target ?? parameters.target
  const targetSpec = parseBlockEffectTarget(rawTarget)
  return {
    ...effect,
    type,
    target: targetSpec?.target ?? rawTarget,
    targetSpec,
    value: Number(effect.value ?? parameters.amount ?? parameters.count ?? 0),
    parameters,
  }
}

export const describeDamageRange = ({ range = 'single', distance = 0 } = {}) => {
  if (range === 'all') return '전체'
  if (range === 'left') return `기준+좌 ${distance}`
  if (range === 'right') return `기준+우 ${distance}`
  if (range === 'both') return `기준+좌우 ${distance}`
  return '단일'
}

export const describePlacedBlockColors = (placedBlocks = []) => {
  const counts = new Map()
  placedBlocks.forEach(({ block }) => {
    const color = block.color
    counts.set(color, (counts.get(color) ?? 0) + 1)
  })
  return [...counts]
    .map(([color, count]) => `${BLOCK_COLOR_LABELS[color] ?? color} ${count}`)
    .join(' · ')
}

const describePreviewStatuses = (updates = []) => updates
  .map((status) => {
    const name = status.name
      ?? STATUS_EFFECTS[status.id]?.name
      ?? status.sourceId
      ?? status.id
    const stacks = Number(status.stacks ?? status.intensify ?? 0)
    return stacks > 0 ? `${name} ${stacks}` : name
  })
  .filter(Boolean)
  .join(', ')

export const describeFinalBlockEffects = (effects, resolvedDamage = {}) => {
  const baseDamage = resolvedDamage.baseDamage ?? effects.baseDamageEffects
    .reduce((sum, effect) => sum + effect.amount, 0)
  const independentDamage = resolvedDamage.independentDamage ?? effects.independentDamageEffects
    .reduce((sum, effect) => sum + effect.amount, 0)
  const damageEffects = [
    ...effects.baseDamageEffects,
    ...effects.independentDamageEffects,
  ]
  const ranges = [...new Set(damageEffects.map(describeDamageRange))]
  const selfBuffs = describePreviewStatuses(
    (effects.buffs ?? []).filter(({ target }) => target === 'self'),
  )
  const enemyDebuffs = describePreviewStatuses(
    (effects.debuffs ?? []).filter(({ target }) => target !== 'self'),
  )
  const damages = [
    baseDamage !== 0 ? `기본 데미지(B) ${baseDamage}` : '',
    independentDamage !== 0 ? `독립 데미지(A) ${independentDamage}` : '',
  ].filter(Boolean).join(' + ')
  return [
    damages,
    ranges.length ? `범위 ${ranges.join('/')}` : '',
    selfBuffs ? `나의 버프 ${selfBuffs}` : '',
    enemyDebuffs ? `적 디버프 ${enemyDebuffs}` : '',
    effects.armor !== 0 ? `방어 ${effects.armor}` : '',
    effects.healing !== 0 ? `회복 ${effects.healing}` : '',
  ].filter(Boolean).join('  /  ')
}

const getCombinationBaseName = (combination) => {
  const familyId = combination.id.replace(/_(steel|fire|water|nature)$/, '')
  const steelVariant = BLOCK_RULE_INDEX.combinations.get(`${familyId}_steel`)
  return steelVariant?.display_name ?? combination.display_name
}

export const getColoredCombinationName = (combination, participatingBlocks = []) => {
  const dominantColor = getDominantCombinationColor(participatingBlocks)
  if (!dominantColor) return getCombinationBaseName(combination)
  const baseName = getCombinationBaseName(combination).replace(/^강철\s+/, '')
  return `${BLOCK_COLOR_PREFIXES[dominantColor]} ${baseName}`
}

export const getDominantCombinationColor = (participatingBlocks = []) => {
  const nonSteelColors = participatingBlocks
    .map(({ block }) => block.color)
    .filter((color) => color !== 'steel' && BLOCK_COLOR_PREFIXES[color])
  if (!nonSteelColors.length) return null
  const counts = nonSteelColors.reduce((result, color) => {
    result.set(color, (result.get(color) ?? 0) + 1)
    return result
  }, new Map())
  return nonSteelColors.reduce((selected, color) =>
    counts.get(color) > counts.get(selected) ? color : selected)
}

export const describeBlockEffect = (rawEffect) => {
  const effect = normalizeEffect(rawEffect)
  const parameters = effect.parameters ?? {}
  if (effect.type === 'BASE_HIT_COUNT') {
    return `연속 공격 ${effect.value}×${parameters.intensify}`
  }
  switch (effect.effect_id) {
    case 'deal_damage': return `공격력 ${effect.value}`
    case 'gain_block': return `방어력 ${effect.value}`
    case 'heal': return `체력 회복 ${effect.value}`
    case 'draw_block': return `추가 드로우 ${effect.value}`
    case 'gain_gold': return `골드 ${effect.value}`
    case 'apply_status': return `${parameters.status_name ?? parameters.status_id} ${parameters.stacks ?? 1}`
    case 'apply_buff': return `${parameters.buff_name ?? parameters.buff_id}`
    case 'modify_next_effect': return `다음 효과 ×${parameters.multiplier}`
    default: {
      const typedLabel = {
        BASE_DAMAGE: '공격력',
        INDEPENDENT_DAMAGE: '효과 피해',
        BLOCK: '방어력',
        RECOVERY: '체력 회복',
        DRAW: '추가 드로우',
        EXTRA_TURN: '추가 턴',
      }[effect.type]
      return typedLabel ? `${typedLabel} ${effect.value}` : effect.effect_id
    }
  }
}

const effectLabel = (effect) => {
  const parameters = effect.parameters ?? {}
  if (effect.type?.toUpperCase() === 'BASE_HIT_COUNT') {
    return `연속 공격 ${effect.value}×${parameters.intensify}`
  }
  switch (effect.effect_id) {
    case 'deal_damage': return `피해 ${parameters.amount}`
    case 'gain_block': return `방어 ${parameters.amount}`
    case 'heal': return `회복 ${parameters.amount}`
    case 'draw_block': return `추가 드로우 ${parameters.count}`
    case 'gain_gold': return `골드 ${parameters.amount}`
    case 'apply_status': return `${parameters.status_name ?? parameters.status_id} ${parameters.stacks ?? 1}`
    case 'apply_buff': return `${parameters.buff_name ?? parameters.buff_id}`
    case 'modify_next_effect': return `다음 효과 ×${parameters.multiplier}`
    default: {
      const typedLabel = {
        BASE_DAMAGE: '공격력',
        INDEPENDENT_DAMAGE: '효과 피해',
        BLOCK: '방어',
        RECOVERY: '회복',
        DRAW: '추가 드로우',
        EXTRA_TURN: '추가 턴',
      }[effect.type?.toUpperCase()]
      return typedLabel ? `${typedLabel} ${effect.value}` : effect.effect_id
    }
  }
}

export const resolveBlockEffects = (placedBlocks, { currentArmor = 0 } = {}) => {
  const matches = findMatchingCombinations(placedBlocks)
  const participatingBlocks = new Set(matches.flatMap((match) => match.participatingBlocks))
  const participatingPlacedBlocks = placedBlocks.filter((placedBlock) =>
    participatingBlocks.has(placedBlock))
  const unusedPlacedBlocks = placedBlocks.filter((placedBlock) =>
    !participatingBlocks.has(placedBlock))
  const combinationStages = getCombinationEffectStages(matches)
  const colorSynergy = resolveColorSynergy(placedBlocks)
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
    extraTurnChanges: [],
    statuses: [],
    statusDamageEffects: [],
    buffs: [],
    debuffs: [],
    crowdControls: [],
    deckCapacityChanges: [],
    placementCountChanges: [],
    operations: [],
    colorSynergy,
    combinations: matches.map(({ combination }) => combination.id),
    combinationDetails: matches.map(({ combination, participatingBlocks }) => {
      const conditionalEffects = combination.conditional_effects.flatMap((entry) =>
        conditionMatches(entry.condition, participatingBlocks) ? entry.effects : [])
      const appliedEffects = [...combination.effects, ...conditionalEffects]
        .sort((left, right) => left.order - right.order)
      return {
        id: combination.id,
        name: getColoredCombinationName(combination, participatingBlocks),
        color: getDominantCombinationColor(participatingBlocks),
        effects: appliedEffects.map(effectLabel),
      }
    }),
  }
  result.hitCountModifier = 0
  result.playerStatuses = []
  let baseDamageAmount = 0
  let baseDamageScope = null
  let damagePacketSequence = 0
  const addEffect = (rawEffect, fallbackDamageKind, {
    convertBaseToIndependent = false,
    packetId = null,
    contributesHitCount = true,
  } = {}) => {
    const effect = normalizeEffect(rawEffect)
    const isDamage = effect.effect_id === 'deal_damage'
      || ['BASE_DAMAGE', 'BASE_HIT_COUNT', 'INDEPENDENT_DAMAGE'].includes(effect.type)
    if (isDamage) {
      if (effect.type === 'BASE_HIT_COUNT' && contributesHitCount) {
        result.hitCountModifier = Math.max(
          result.hitCountModifier,
          Math.max(0, effect.parameters.intensify - 1),
        )
      }
      const amount = effect.value
      const targetRange = effect.targetSpec?.range ?? 'single'
      const range = targetRange === 'single'
        ? effect.parameters.range ?? targetRange
        : targetRange
      const targetDistance = effect.targetSpec?.distance ?? 0
      const isBaseDamage = ['BASE_DAMAGE', 'BASE_HIT_COUNT'].includes(effect.type)
      const damageKind = isBaseDamage && !convertBaseToIndependent
        ? 'baseDamageEffects'
        : effect.type === 'INDEPENDENT_DAMAGE'
          ? 'independentDamageEffects'
          : convertBaseToIndependent
            ? 'independentDamageEffects'
            : fallbackDamageKind
      const damageEffect = {
        target: effect.target ?? 'enemy',
        range,
        distance: Number(effect.targetSpec
          ? targetDistance
          : effect.parameters.distance ?? (range === 'single' ? 0 : 1)),
        amount,
      }
      if (damageKind === 'independentDamageEffects') {
        Object.defineProperty(damageEffect, 'packetId', {
          value: packetId ?? `independent-${damagePacketSequence += 1}`,
          enumerable: false,
        })
      }
      if (damageKind === 'baseDamageEffects') {
        baseDamageAmount += amount
        baseDamageScope = damageEffect
      } else {
        result.damage += amount
        result.damageEffects.push(damageEffect)
        result[damageKind].push(damageEffect)
        if (range === 'all') result.damageByTarget.allEnemies += amount
        else result.damageByTarget.enemy += amount
      }
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
      if (!['CURRENT_ACTION', 'PLAYER_TURN'].includes(effect.parameters.id)) {
        throw new BlockRulesRuntimeError(
          'DISPATCH',
          `EXTRA_TURN은 parameters.id=CURRENT_ACTION 또는 PLAYER_TURN이 필요합니다. (현재: ${effect.parameters.id})`,
        )
      }
      result.extraTurns += effect.value
      result.extraTurnChanges.push({
        turnId: effect.parameters.id,
        value: effect.value,
        duration: 0,
        intensify: 1,
      })
      return
    }
    if (effect.type === 'DECK_CAPACITY') {
      result.deckCapacityChanges.push({
        deckId: effect.parameters.id,
        value: effect.value,
        duration: 0,
        intensify: 1,
      })
      return
    }
    if (effect.type === 'PLACEMENT_COUNT') {
      if (effect.parameters.id !== 'BLOCK_PLACEMENT') {
        throw new BlockRulesRuntimeError(
          'DISPATCH',
          `PLACEMENT_COUNT는 parameters.id=BLOCK_PLACEMENT가 필요합니다. (현재: ${effect.parameters.id})`,
        )
      }
      result.placementCountChanges.push({
        placementId: effect.parameters.id,
        value: effect.value,
        duration: 0,
        intensify: 1,
      })
      return
    }
    const additive = ADDITIVE_EFFECTS[effect.effect_id]
    if (additive) {
      result[additive.resultKey] += Number(effect.parameters[additive.parameter] ?? 0)
      return
    }
    if (effect.type === 'STATUS_DAMAGE') {
      const status = createStatusUpdateFromEffect(effect)
      if (!status) {
        throw new BlockRulesRuntimeError('DISPATCH', [
          `effect_id=${effect.effect_id ?? '없음'}`,
          `type=${effect.type}`,
          `parameters.id=${effect.parameters.id ?? '없음'}`,
          '이 상태 피해를 실행할 런타임 처리기가 없습니다.',
        ])
      }
      if (effect.target === 'self') {
        result.playerStatuses.push(status)
      } else {
        result.statusDamageEffects.push({
          ...status,
          target: effect.target,
          range: effect.targetSpec?.range ?? 'single',
          distance: effect.targetSpec?.distance ?? 0,
        })
      }
      return
    }
    if (effect.effect_id === 'apply_status' || ['DEBUFF', 'CROWD_CONTROL', 'BUFF'].includes(effect.type)) {
      const parameterId = effect.parameters.id ?? effect.parameters.status_id
      const commonStatus = createStatusUpdateFromEffect(effect)
      const status = {
        id: effect.reference_id ?? commonStatus?.id ?? parameterId,
        sourceId: commonStatus?.sourceId ?? parameterId,
        name: effect.parameters.status_name,
        stacks: Number(effect.parameters.stacks ?? effect.parameters.intensify ?? effect.value ?? 1),
        value: effect.value,
        duration: effect.parameters.duration ?? null,
        intensify: effect.parameters.intensify ?? 0,
        target: effect.target,
        range: effect.targetSpec?.range ?? 'single',
        distance: effect.targetSpec?.distance ?? 0,
      }
      if (effect.type === 'BUFF') result.buffs.push(status)
      if (effect.type === 'DEBUFF') result.debuffs.push(status)
      if (effect.type === 'CROWD_CONTROL') result.crowdControls.push(status)
      if (effect.target === 'self') result.playerStatuses.push(status)
      else result.statuses.push(status)
      return
    }
    throw new BlockRulesRuntimeError('DISPATCH', [
      `effect_id=${effect.effect_id ?? '없음'}`,
      `type=${effect.type ?? '없음'}`,
      `parameters.id=${effect.parameters.id ?? '없음'}`,
      '이 효과를 실행할 런타임 처리기가 없습니다.',
    ])
  }
  participatingPlacedBlocks.forEach(({ block }) => {
    block.effects?.forEach((effect) => addEffect(effect, 'baseDamageEffects'))
  })
  independentEffects.forEach((effect) => addEffect(effect, 'independentDamageEffects'))
  unusedPlacedBlocks.forEach(({ block }, blockIndex) => {
    const convertedBasePacketId = `unused-block-${block.id ?? blockIndex}-base`
    block.effects?.forEach((effect) => addEffect(effect, 'independentDamageEffects', {
      convertBaseToIndependent: true,
      packetId: ['BASE_DAMAGE', 'BASE_HIT_COUNT'].includes(effect.type?.toUpperCase())
        ? convertedBasePacketId
        : null,
      contributesHitCount: false,
    }))
  })
  if (colorSynergy.independentRange === 'all') {
    if (baseDamageScope) {
      baseDamageScope.target = 'allEnemies'
      baseDamageScope.range = 'all'
      baseDamageScope.distance = 0
    }
    result.independentDamageEffects.forEach((effect) => {
      effect.target = 'allEnemies'
      effect.range = 'all'
      effect.distance = 0
    })
  }
  result.armor = (result.armor + colorSynergy.armor) * colorSynergy.armorMultiplier
  result.healing += colorSynergy.healing
  result.hitCountModifier += colorSynergy.hitCountModifier
  result.retainArmorNextTurn = colorSynergy.retainArmorNextTurn
  const armorDamage = colorSynergy.addArmorToIndependentDamage
    ? Math.max(0, Number(currentArmor)) + result.armor
    : 0
  const synergyIndependentDamage = colorSynergy.independentDamage + armorDamage
  if (synergyIndependentDamage) {
    const damageEffect = {
      target: colorSynergy.independentRange === 'all' ? 'allEnemies' : 'enemy',
      range: colorSynergy.independentRange,
      distance: 0,
      amount: synergyIndependentDamage,
    }
    result.damage += synergyIndependentDamage
    result.damageEffects.push(damageEffect)
    result.independentDamageEffects.push(damageEffect)
    if (damageEffect.range === 'all') result.damageByTarget.allEnemies += synergyIndependentDamage
    else result.damageByTarget.enemy += synergyIndependentDamage
  }
  if (baseDamageScope) {
    const baseDamageEffect = { ...baseDamageScope, amount: baseDamageAmount }
    result.damage += baseDamageAmount
    result.damageEffects.unshift(baseDamageEffect)
    result.baseDamageEffects.push(baseDamageEffect)
    if (baseDamageEffect.range === 'all') result.damageByTarget.allEnemies += baseDamageAmount
    else result.damageByTarget.enemy += baseDamageAmount
  }
  result.damageByTarget = result.damageEffects.reduce((totals, effect) => {
    if (effect.range === 'all') totals.allEnemies += effect.amount
    else totals.enemy += effect.amount
    return totals
  }, { enemy: 0, allEnemies: 0 })
  return result
}
