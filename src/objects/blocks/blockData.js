import {
  getRuleBlock,
  getStarterBlockDefinitions,
  getUniqueBlockDefinitions,
} from '../../game/systems/blockRulesSystem.js'

const LEGACY_TYPES = { I: 's001', L: 's002', O: 's003' }
const STANDARD_COLOR_ORDER = ['steel', 'water', 'nature', 'fire']

const getShapeLabel = (definition) => {
  if (definition.id.endsWith('001') && definition.shape.cells.length === 3) return 'I'
  if (definition.id.endsWith('002') && definition.shape.cells.length === 3) return 'L'
  if (definition.id.endsWith('003') && definition.shape.cells.length === 4) return 'O'
  return definition.display_name
}

export const createBlock = (definitionId, index) => {
  const resolvedId = LEGACY_TYPES[definitionId] ?? definitionId
  const definition = getRuleBlock(resolvedId)
  if (!definition) throw new Error(`Unknown block definition: ${definitionId}`)
  return {
    id: `${definition.id}-${index}-${Math.random().toString(36).slice(2, 7)}`,
    definitionId: definition.id,
    type: definition.type_id,
    typeId: definition.type_id,
    name: definition.display_name,
    shape: getShapeLabel(definition),
    color: definition.color_id,
    cells: definition.shape.cells.map(({ x, y }) => [x, y]),
    transform: { ...definition.transform },
    effects: definition.effects.map((effect) => ({
      ...effect,
      parameters: { ...effect.parameters },
    })),
    tags: [...definition.tags],
    description: definition.description,
  }
}

export const createStarterDeck = () =>
  getStarterBlockDefinitions()
    .flatMap((definition) => Array.from({ length: 4 }, () => definition.id))
    .map((id, index) => createBlock(id, index))

export const createTutorialDeck = () => {
  const deck = [
  's001', 's002', 's003', 's001', 's002',
  's003', 's001', 's002', 's003', 's001',
  's002', 's003', 's001',
  ].map((id, index) => createBlock(id, `tutorial-${index}`))
  // 첫 블록은 R 한 번으로 의자 조합의 세로 I 블록이 되도록 가로 방향으로 제공한다.
  deck[0] = { ...deck[0], cells: [[0, 0], [1, 0], [2, 0]] }
  return deck
}

export const createUniqueBlockChoiceIds = (count = 3, random = Math.random) => {
  const definitions = [...getUniqueBlockDefinitions()]
  for (let index = definitions.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1))
    ;[definitions[index], definitions[target]] = [definitions[target], definitions[index]]
  }
  return definitions.slice(0, Math.min(count, definitions.length)).map(({ id }) => id)
}

export const createUniqueBlockChoices = (definitionIds = getUniqueBlockDefinitions().map(({ id }) => id)) =>
  definitionIds.map((id, index) => createBlock(id, `unique-${index}`))

export const cycleStandardBlockColor = (block) => {
  const colorIndex = STANDARD_COLOR_ORDER.indexOf(block?.color)
  if (colorIndex < 0 || !STANDARD_COLOR_ORDER.includes(block?.typeId)) return block
  const nextColor = STANDARD_COLOR_ORDER[(colorIndex + 1) % STANDARD_COLOR_ORDER.length]
  const shapeSuffix = block.definitionId?.slice(-3)
  const nextDefinition = getRuleBlock(`${nextColor[0]}${shapeSuffix}`)
  if (!nextDefinition) return block
  return { ...createBlock(nextDefinition.id, 'developer-color'), id: block.id }
}

export const hydrateBlock = (block, index = 0) => {
  if (block?.definitionId && getRuleBlock(block.definitionId)) {
    return { ...createBlock(block.definitionId, index), id: block.id }
  }
  if (block?.tags?.includes('unique')) return { ...createBlock('a001', index), id: block.id }
  const prefix = { fire: 'f', water: 'w', nature: 'n', steel: 's', neutral: 's' }[block?.color] ?? 's'
  const suffix = { I: '001', L: '002', O: '003' }[block?.shape] ?? '001'
  return { ...createBlock(`${prefix}${suffix}`, index), id: block?.id ?? `${prefix}${suffix}-${index}` }
}
