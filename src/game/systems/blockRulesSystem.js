import rulesSource from '../../../docs/references/designs/blockable_block_design.json?raw'

export const BLOCK_RULES_SOURCE_PATH = 'docs/references/designs/blockable_block_design.json'
export const SUPPORTED_BLOCK_RULES_SCHEMA = '1.1.0'
export const STANDARD_BLOCK_TYPE_IDS = Object.freeze(['steel', 'fire', 'water', 'nature'])

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
  'NONE',
  'CURRENT_ACTION',
  'DAMAGE_TAKEN_INCREASE',
  'MAIN_DECK',
])
const SUPPORTED_SLOT_KINDS = new Set(['exact_block', 'any_block', 'type', 'color', 'tag'])
const SUPPORTED_CONDITION_KINDS = new Set([
  'all_same_color',
  'all_different_colors',
  'contains_color',
  'color_count',
  'color_set',
  'same_type',
  'block_count',
  'tag_match',
])

export const parseBlockEffectTarget = (rawTarget = 'SELECTED') => {
  const target = String(rawTarget).trim()
  const upperTarget = target.toUpperCase()
  if (['SELECTED', 'ENEMY'].includes(upperTarget)) {
    return { target: 'enemy', range: 'single', distance: 0 }
  }
  if (upperTarget === 'SELF') {
    return { target: 'self', range: 'single', distance: 0 }
  }
  if (['ALL', 'ALL_ENEMIES'].includes(upperTarget)) {
    return { target: 'allEnemies', range: 'all', distance: 0 }
  }
  const directional = /^([LRB])(\d+)$/.exec(upperTarget)
  if (!directional) return null
  return {
    target: 'enemy',
    range: { L: 'left', R: 'right', B: 'both' }[directional[1]],
    distance: Number(directional[2]),
  }
}

export class BlockRulesRuntimeError extends Error {
  constructor(stage, details, cause) {
    const detailList = Array.isArray(details) ? details : [details]
    super([
      `[Block Rules ${stage}] ${BLOCK_RULES_SOURCE_PATH}`,
      ...detailList.map((detail) => `- ${detail}`),
    ].join('\n'), cause ? { cause } : undefined)
    this.name = 'BlockRulesRuntimeError'
    this.stage = stage
    this.sourcePath = BLOCK_RULES_SOURCE_PATH
    this.details = detailList
  }
}

const duplicateIds = (items) => {
  const seen = new Set()
  return items.map(({ id }) => id).filter((id) => {
    if (seen.has(id)) return true
    seen.add(id)
    return false
  })
}

const requireArray = (value, key, errors) => {
  if (!Array.isArray(value?.[key])) {
    errors.push(`${key}: 배열이 필요합니다.`)
    return []
  }
  return value[key]
}

const runtimeColorId = ({ type_id: typeId, grade, color }) => {
  if (color && color !== 'none') return color
  if (grade === 'legend' || typeId === 'legend') return 'legendary'
  return typeId
}

const normalizeDesignerRules = (raw) => {
  const errors = []
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new BlockRulesRuntimeError('NORMALIZE', '최상위 값은 JSON 객체여야 합니다.')
  }
  const blocks = requireArray(raw, 'blocks', errors)
  const combinations = requireArray(raw, 'combinations', errors)
  if (errors.length) throw new BlockRulesRuntimeError('NORMALIZE', errors)

  const blockTypes = [...new Map(blocks.map((block, index) => {
    const blockType = block?.block_type
    if (!blockType?.type_id) {
      errors.push(`blocks[${index}].block_type.type_id: 필수 값 누락`)
      return [null, null]
    }
    const colorId = runtimeColorId(blockType)
    return [blockType.type_id, {
      id: blockType.type_id,
      display_name: blockType.type_name ?? blockType.type_id,
      grade: blockType.grade,
      color_id: colorId,
    }]
  }).filter(([id]) => id)).values()]
  const colors = [...new Map(blockTypes.map((type) => [type.color_id, {
    id: type.color_id,
    display_name: type.display_name,
  }])).values()]

  const normalizedBlocks = blocks.map((block, index) => {
    if (!block?.block_id) errors.push(`blocks[${index}].block_id: 필수 값 누락`)
    const blockType = block?.block_type ?? {}
    return {
      id: block?.block_id,
      display_name: block?.block_name ?? block?.block_id,
      description: block?.description ?? '',
      type_id: blockType.type_id,
      color_id: runtimeColorId(blockType),
      shape: block?.shape,
      transform: {
        allow_rotation: block?.transform_rule?.allow_rotation ?? false,
        allow_reflection: block?.transform_rule?.allow_reflection ?? false,
      },
      effects: (block?.effects ?? []).map((effect, effectIndex) => ({
        ...effect,
        order: effect.order ?? effectIndex,
      })),
      tags: [blockType.type_id, blockType.grade].filter(Boolean),
    }
  })
  const normalizedCombinations = combinations.map((combination, index) => {
    if (!combination?.combination_id) {
      errors.push(`combinations[${index}].combination_id: 필수 값 누락`)
    }
    return {
      id: combination?.combination_id,
      display_name: combination?.combination_name ?? combination?.combination_id,
      description: combination?.description ?? '',
      instances: (combination?.formula?.instances ?? []).map((instance) => ({
        ...instance,
        mirrored: instance.reflected ?? false,
        match: instance.match ?? { kind: 'exact_block' },
      })),
      match_options: {
        allow_recipe_rotation: combination?.transform_rule?.allow_rotation ?? false,
        allow_recipe_mirroring: combination?.transform_rule?.allow_reflection ?? false,
      },
      effects: (combination?.effects ?? []).map((effect, effectIndex) => ({
        ...effect,
        order: effect.order ?? effectIndex,
      })),
      conditional_effects: combination?.conditional_effects ?? [],
      tags: combination?.tags ?? [],
    }
  })
  if (errors.length) throw new BlockRulesRuntimeError('NORMALIZE', errors)

  const effectDefinitions = [...new Map(
    [...normalizedBlocks, ...normalizedCombinations]
      .flatMap(({ effects }) => effects)
      .map((effect) => [effect.effect_name, {
        id: effect.effect_name,
        display_name: effect.effect_name,
        description: effect.description ?? '',
      }]),
  ).values()]

  return {
    schema_version: raw.schema_version,
    data_type: raw.data_type,
    metadata: raw.metadata ?? {},
    colors,
    block_types: blockTypes,
    effect_definitions: effectDefinitions,
    blocks: normalizedBlocks,
    combinations: normalizedCombinations,
    color_synergies: raw.color_synergies ?? [],
  }
}

export const parseBlockRules = (source = rulesSource) => {
  let raw
  try {
    raw = JSON.parse(source)
  } catch (cause) {
    throw new BlockRulesRuntimeError('PARSE', cause.message, cause)
  }
  return normalizeDesignerRules(raw)
}

const validateEffect = (effect, location, errors) => {
  if (!effect?.effect_id) errors.push(`${location}.effect_id: 필수 값 누락`)
  const type = effect?.type?.toUpperCase()
  if (!SUPPORTED_EFFECT_TYPES.has(type)) {
    errors.push(`${location}.type: 지원하지 않는 공통 효과 타입 ${effect?.type ?? '없음'}`)
  }
  if (!Number.isInteger(effect?.value)) errors.push(`${location}.value: 정수가 필요합니다.`)
  if (!parseBlockEffectTarget(effect?.target)) {
    errors.push(`${location}.target: 지원하지 않는 대상 형식 ${effect?.target ?? '없음'}`)
  }
  const parameterId = effect?.parameters?.id
  if (!parameterId) {
    errors.push(`${location}.parameters.id: 필수 값 누락`)
  } else if (!SUPPORTED_PARAMETER_IDS.has(parameterId)) {
    errors.push(`${location}.parameters.id: 런타임 처리기가 없는 사용자 정의 변수 ${parameterId}`)
  }
  const duration = effect?.parameters?.duration
  if (!Number.isInteger(duration) || duration < -2) {
    errors.push(`${location}.parameters.duration: -2 이상의 정수가 필요합니다.`)
  }
  const intensify = effect?.parameters?.intensify
  if (!Number.isInteger(intensify) || intensify < 0) {
    errors.push(`${location}.parameters.intensify: 0 이상의 정수가 필요합니다.`)
  }
  if (type === 'BASE_HIT_COUNT' && (!Number.isInteger(intensify) || intensify < 1)) {
    errors.push(`${location}.parameters.intensify: BASE_HIT_COUNT는 1 이상의 연속 공격 횟수가 필요합니다.`)
  }
  if (type === 'BASE_HIT_COUNT' && parameterId !== 'CURRENT_ACTION') {
    errors.push(`${location}.parameters.id: BASE_HIT_COUNT는 CURRENT_ACTION이 필요합니다.`)
  }
  if (parameterId === 'CURRENT_ACTION' && type !== 'BASE_HIT_COUNT') {
    errors.push(`${location}.parameters.id: CURRENT_ACTION은 BASE_HIT_COUNT에서만 사용할 수 있습니다.`)
  }
}

const validateCondition = (condition, colorIds, location, errors) => {
  if (!condition || !SUPPORTED_CONDITION_KINDS.has(condition.kind)) {
    errors.push(`${location}.kind: 지원하지 않는 조건 ${condition?.kind ?? '없음'}`)
    return
  }
  const parameters = condition.parameters ?? {}
  if (parameters.color_id && !colorIds.has(parameters.color_id)) {
    errors.push(`${location}.parameters.color_id: 알 수 없는 색상 ${parameters.color_id}`)
  }
  parameters.color_ids?.forEach((colorId) => {
    if (!colorIds.has(colorId)) {
      errors.push(`${location}.parameters.color_ids: 알 수 없는 색상 ${colorId}`)
    }
  })
  if ('count' in parameters && (!Number.isInteger(parameters.count) || parameters.count < 0)) {
    errors.push(`${location}.parameters.count: 0 이상의 정수가 필요합니다.`)
  }
}

export const validateBlockRules = (value = BLOCK_RULES) => {
  const errors = []
  const warnings = []
  const arrays = ['colors', 'block_types', 'effect_definitions', 'blocks', 'combinations', 'color_synergies']
  if (value.schema_version !== SUPPORTED_BLOCK_RULES_SCHEMA) {
    errors.push(`schema_version: ${value.schema_version ?? '없음'} (지원: ${SUPPORTED_BLOCK_RULES_SCHEMA})`)
  }
  if (value.data_type !== 'blockable_block_design') {
    errors.push(`data_type: ${value.data_type ?? '없음'} (필요: blockable_block_design)`)
  }
  if (value.metadata?.validation_status === 'invalid') errors.push('metadata.validation_status: invalid')
  if (!('validation_status' in (value.metadata ?? {}))) warnings.push('metadata.validation_status가 없어 런타임 검증을 사용합니다.')
  arrays.forEach((key) => {
    if (!Array.isArray(value[key])) errors.push(`${key}: 배열이 필요합니다.`)
  })
  if (errors.length) return { valid: false, errors, warnings }

  arrays.forEach((key) => {
    duplicateIds(value[key]).forEach((id) => errors.push(`${key}: 중복 ID ${id}`))
  })
  const colorIds = new Set(value.colors.map(({ id }) => id))
  const typeIds = new Set(value.block_types.map(({ id }) => id))
  const blocks = new Map(value.blocks.map((block) => [block.id, block]))

  value.blocks.forEach((block) => {
    if (!typeIds.has(block.type_id)) errors.push(`blocks.${block.id}.type_id: ${block.type_id}`)
    if (!colorIds.has(block.color_id)) errors.push(`blocks.${block.id}.color_id: ${block.color_id}`)
    if (!block.shape?.cells?.length) errors.push(`blocks.${block.id}.shape.cells: 빈 모양`)
    block.shape?.cells?.forEach((cell, index) => {
      if (!Number.isInteger(cell.x) || !Number.isInteger(cell.y)) {
        errors.push(`blocks.${block.id}.shape.cells[${index}]: 정수 좌표가 필요합니다.`)
      }
    })
    block.effects.forEach((effect, index) =>
      validateEffect(effect, `blocks.${block.id}.effects[${index}]`, errors))
  })
  value.combinations.forEach((combination) => {
    const occupied = new Set()
    if (!combination.instances.length) errors.push(`combinations.${combination.id}.instances: 빈 조합식`)
    combination.instances.forEach((instance, index) => {
      const block = blocks.get(instance.block_id)
      if (!block) errors.push(`combinations.${combination.id}.instances[${index}].block_id: ${instance.block_id}`)
      if (![0, 90, 180, 270].includes(instance.rotation)) {
        errors.push(`combinations.${combination.id}.instances[${index}].rotation: ${instance.rotation}`)
      }
      if (!Number.isInteger(instance.origin?.x) || !Number.isInteger(instance.origin?.y)) {
        errors.push(`combinations.${combination.id}.instances[${index}].origin: 정수 좌표가 필요합니다.`)
      }
      const match = instance.match ?? { kind: 'exact_block' }
      if (!SUPPORTED_SLOT_KINDS.has(match.kind)) {
        errors.push(`combinations.${combination.id}.instances[${index}].match.kind: ${match.kind}`)
      }
      if (match.kind === 'type' && !typeIds.has(match.type_id)) {
        errors.push(`combinations.${combination.id}.instances[${index}].match.type_id: ${match.type_id}`)
      }
      if (match.kind === 'color' && !colorIds.has(match.color_id)) {
        errors.push(`combinations.${combination.id}.instances[${index}].match.color_id: ${match.color_id}`)
      }
      if (block) {
        transformCells(block.shape.cells, {
          rotation: instance.rotation,
          mirrored: instance.mirrored,
          origin: instance.origin,
        }).forEach((cell) => {
          const key = cellKey(cell)
          if (occupied.has(key)) errors.push(`combinations.${combination.id}: 인스턴스 칸 겹침 ${key}`)
          occupied.add(key)
        })
      }
    })
    combination.effects.forEach((effect, index) =>
      validateEffect(effect, `combinations.${combination.id}.effects[${index}]`, errors))
    combination.conditional_effects.forEach((entry, index) => {
      validateCondition(
        entry.condition,
        colorIds,
        `combinations.${combination.id}.conditional_effects[${index}].condition`,
        errors,
      )
      entry.effects?.forEach((effect, effectIndex) =>
        validateEffect(effect, `combinations.${combination.id}.conditional_effects[${index}].effects[${effectIndex}]`, errors))
    })
  })
  value.color_synergies.forEach((synergy) => {
    validateCondition(synergy.condition, colorIds, `color_synergies.${synergy.id}.condition`, errors)
    synergy.effects.forEach((effect, index) =>
      validateEffect(effect, `color_synergies.${synergy.id}.effects[${index}]`, errors))
  })
  return { valid: errors.length === 0, errors, warnings }
}

export const cellKey = ({ x, y }) => `${x},${y}`

export const normalizeCells = (cells) => {
  const minX = Math.min(...cells.map(({ x }) => x))
  const minY = Math.min(...cells.map(({ y }) => y))
  return cells.map(({ x, y }) => ({ x: x - minX, y: y - minY }))
}

export const transformCells = (cells, {
  rotation = 0,
  mirrored = false,
  origin = { x: 0, y: 0 },
  normalize = true,
} = {}) => {
  let transformed = cells.map(({ x, y }) => ({ x: mirrored ? -x : x, y }))
  for (let angle = 0; angle < rotation; angle += 90) {
    transformed = transformed.map(({ x, y }) => ({ x: -y, y: x }))
  }
  if (normalize) transformed = normalizeCells(transformed)
  return transformed.map(({ x, y }) => ({ x: x + origin.x, y: y + origin.y }))
}

const rules = parseBlockRules()
const validation = validateBlockRules(rules)
if (!validation.valid) throw new BlockRulesRuntimeError('VALIDATE', validation.errors)

const indexes = {
  colors: new Map(rules.colors.map((item) => [item.id, item])),
  types: new Map(rules.block_types.map((item) => [item.id, item])),
  effects: new Map(rules.effect_definitions.map((item) => [item.id, item])),
  blocks: new Map(rules.blocks.map((item) => [item.id, item])),
  combinations: new Map(rules.combinations.map((item) => [item.id, item])),
  synergies: new Map(rules.color_synergies.map((item) => [item.id, item])),
}

export const BLOCK_RULES = Object.freeze(rules)
export const BLOCK_RULE_INDEX = Object.freeze(indexes)
export const BLOCK_RULE_VALIDATION = Object.freeze(validation)
export const getRuleBlock = (id) => indexes.blocks.get(id)
export const blockMatchesRecipeTemplate = (templateBlockId, candidateBlock) => {
  const template = indexes.blocks.get(templateBlockId)
  if (!template || !candidateBlock) return false
  const templateIsStandard = STANDARD_BLOCK_TYPE_IDS.includes(template.type_id)
  const candidateIsStandard = STANDARD_BLOCK_TYPE_IDS.includes(candidateBlock.typeId)
  if (templateIsStandard && candidateIsStandard) return true
  return candidateBlock.definitionId === templateBlockId
}
export const getStarterBlockDefinitions = () => ['s001', 's002', 's003'].map(getRuleBlock)
export const getUniqueBlockDefinitions = () => rules.blocks.filter(({ type_id }) => type_id === 'special')
export const getRewardBlockDefinitions = () =>
  rules.blocks.filter(({ type_id }) => STANDARD_BLOCK_TYPE_IDS.includes(type_id))
