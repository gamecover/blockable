import rules from '../../../docs/references/designs/blockable_block_design.json'

export const SUPPORTED_BLOCK_RULES_SCHEMA = '1.1.0'
export const SUPPORTED_BLOCK_EFFECT_IDS = new Set([
  'deal_damage',
  'gain_block',
  'heal',
  'apply_status',
  'apply_buff',
  'draw_block',
  'gain_gold',
  'modify_next_effect',
])
const SUPPORTED_SLOT_KINDS = new Set(['exact_block', 'any_block', 'type', 'color', 'tag'])

const duplicateIds = (items) => {
  const seen = new Set()
  return items.map(({ id }) => id).filter((id) => {
    if (seen.has(id)) return true
    seen.add(id)
    return false
  })
}

const validateEffect = (effect, effectDefinitions, location, errors) => {
  const definition = effectDefinitions.get(effect.effect_id)
  if (!definition) {
    errors.push(`${location}.effect_id: 알 수 없는 효과 ${effect.effect_id}`)
    return
  }
  if (!SUPPORTED_BLOCK_EFFECT_IDS.has(effect.effect_id)) {
    errors.push(`${location}.effect_id: 게임에서 지원하지 않는 효과 ${effect.effect_id}`)
  }
  definition.parameters.filter(({ required }) => required).forEach(({ key }) => {
    if (!(key in (effect.parameters ?? {}))) errors.push(`${location}.parameters.${key}: 필수 값 누락`)
  })
}

export const validateBlockRules = (value = rules) => {
  const errors = []
  const warnings = []
  const arrays = ['colors', 'block_types', 'effect_definitions', 'blocks', 'combinations', 'color_synergies']
  if (value.schema_version !== SUPPORTED_BLOCK_RULES_SCHEMA) {
    errors.push(`schema_version: ${value.schema_version ?? '없음'} (지원: ${SUPPORTED_BLOCK_RULES_SCHEMA})`)
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
  const effects = new Map(value.effect_definitions.map((effect) => [effect.id, effect]))

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
      validateEffect(effect, effects, `blocks.${block.id}.effects[${index}]`, errors))
  })
  value.combinations.forEach((combination) => {
    const occupied = new Set()
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
      validateEffect(effect, effects, `combinations.${combination.id}.effects[${index}]`, errors))
    combination.conditional_effects.forEach((entry, index) =>
      entry.effects?.forEach((effect, effectIndex) =>
        validateEffect(effect, effects, `combinations.${combination.id}.conditional_effects[${index}].effects[${effectIndex}]`, errors)))
  })
  value.color_synergies.forEach((synergy) =>
    synergy.effects.forEach((effect, index) =>
      validateEffect(effect, effects, `color_synergies.${synergy.id}.effects[${index}]`, errors)))
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

const indexes = {
  colors: new Map(rules.colors.map((item) => [item.id, item])),
  types: new Map(rules.block_types.map((item) => [item.id, item])),
  effects: new Map(rules.effect_definitions.map((item) => [item.id, item])),
  blocks: new Map(rules.blocks.map((item) => [item.id, item])),
  combinations: new Map(rules.combinations.map((item) => [item.id, item])),
  synergies: new Map(rules.color_synergies.map((item) => [item.id, item])),
}

const validation = validateBlockRules(rules)
if (!validation.valid) throw new Error(`blockable_block_design.json 검증 실패\n${validation.errors.join('\n')}`)

export const BLOCK_RULES = Object.freeze(rules)
export const BLOCK_RULE_INDEX = Object.freeze(indexes)
export const BLOCK_RULE_VALIDATION = Object.freeze(validation)
export const getRuleBlock = (id) => indexes.blocks.get(id)
export const getStarterBlockDefinitions = () => ['s001', 's002', 's003'].map(getRuleBlock)
export const getUniqueBlockDefinitions = () => rules.blocks.filter(({ type_id }) => type_id === 'special')
export const getRewardBlockDefinitions = () =>
  rules.blocks.filter(({ type_id }) => ['steel', 'fire', 'water', 'nature'].includes(type_id))
