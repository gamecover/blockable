import { getBlockDefinition, getUniqueBlockDefinitions } from '../../game/systems/blockDefinitionSystem.js'

const LEGACY_TYPES = { I: 'basic-i', O: 'basic-o', L: 'basic-l' }

export const createBlock = (typeOrShape, index, colorOverride) => {
  const type = LEGACY_TYPES[typeOrShape] ?? typeOrShape
  const definition = getBlockDefinition(type)
  if (!definition) throw new Error(`Unknown block type: ${typeOrShape}`)
  return {
    id: `${definition.type}-${index}-${Math.random().toString(36).slice(2, 7)}`,
    type: definition.type,
    name: definition.name,
    shape: definition.type.endsWith('-i') ? 'I' : definition.type.endsWith('-o') ? 'O' : 'L',
    color: colorOverride ?? definition.color,
    cells: definition.shape,
    effectIds: [...definition.effectIds],
    tags: [...definition.tags],
  }
}

export const createStarterDeck = () =>
  ['I', 'I', 'I', 'I', 'O', 'O', 'O', 'O', 'L', 'L', 'L', 'L']
    .map((shape, index) => createBlock(shape, index))

export const createUniqueBlockChoices = () =>
  getUniqueBlockDefinitions().map(({ type }, index) => createBlock(type, `unique-${index}`))
