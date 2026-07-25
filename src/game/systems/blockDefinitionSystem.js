import blockTypes from '../../assets/manifests/block-types.json'
import blockColors from '../../assets/manifests/block-colors.json'
import blockEffects from '../../assets/manifests/block-effects.json'
import blockCombinations from '../../assets/manifests/block-combinations.json'

const isCell = (cell) => Array.isArray(cell)
  && cell.length === 2
  && cell.every(Number.isInteger)

export const validateBlockDefinitions = ({
  types = blockTypes,
  colors = blockColors,
  effects = blockEffects,
  combinations = blockCombinations,
} = {}) => {
  const colorIds = new Set(colors.colors.map(({ id }) => id))
  const effectIds = new Set(effects.effects.map(({ id }) => id))
  const errors = []

  types.blocks.forEach((block) => {
    if (!block.type || !Array.isArray(block.shape) || !block.shape.every(isCell)) {
      errors.push(`잘못된 블록 정의: ${block.type ?? 'unknown'}`)
    }
    if (!colorIds.has(block.color)) errors.push(`알 수 없는 색상: ${block.color}`)
    block.effectIds.forEach((id) => {
      if (!effectIds.has(id)) errors.push(`알 수 없는 효과: ${id}`)
    })
  })
  combinations.combinations.forEach((combination) => {
    combination.effectIds?.forEach((id) => {
      if (!effectIds.has(id)) errors.push(`알 수 없는 조합 효과: ${id}`)
    })
  })
  return { valid: errors.length === 0, errors }
}

const definitions = new Map(blockTypes.blocks.map((block) => [block.type, block]))

export const getBlockDefinition = (type) => definitions.get(type)
export const getUniqueBlockDefinitions = () =>
  blockTypes.blocks.filter(({ tags }) => tags.includes('unique'))

export const BLOCK_DATA = Object.freeze({
  types: blockTypes,
  colors: blockColors,
  effects: blockEffects,
  combinations: blockCombinations,
})
