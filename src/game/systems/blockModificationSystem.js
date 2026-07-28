import { createBlock } from '../../objects/blocks/blockData.js'
import { getRuleBlock } from './blockRulesSystem.js'

export const STANDARD_BLOCK_COLORS = Object.freeze(['nature', 'water', 'fire', 'steel'])
export const STANDARD_BLOCK_SHAPES = Object.freeze(['001', '002', '003'])

export const isModifiableStandardBlock = (block) =>
  STANDARD_BLOCK_COLORS.includes(block?.typeId)
  && STANDARD_BLOCK_SHAPES.includes(block?.definitionId?.slice(-3))

const replaceDefinition = (block, definitionId) => {
  if (!isModifiableStandardBlock(block) || !getRuleBlock(definitionId)) return block
  return { ...createBlock(definitionId, 'rest-modification'), id: block.id }
}

export const infuseBlockColor = (block, color) => {
  if (!STANDARD_BLOCK_COLORS.includes(color)) return block
  return replaceDefinition(block, `${color[0]}${block.definitionId.slice(-3)}`)
}

export const changeBlockShape = (block, shapeId) => {
  if (!STANDARD_BLOCK_SHAPES.includes(shapeId)) return block
  return replaceDefinition(block, `${block.color[0]}${shapeId}`)
}
