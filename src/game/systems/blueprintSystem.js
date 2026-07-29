import {
  BLOCK_RULE_INDEX,
  BLOCK_RULES,
  blockMatchesRecipeTemplate,
  cellKey,
  normalizeCells,
  transformCells,
} from './blockRulesSystem.js'

const sameCellShape = (left, right) => {
  const leftKeys = new Set(normalizeCells(left).map(cellKey))
  const rightKeys = new Set(normalizeCells(right).map(cellKey))
  return leftKeys.size === rightKeys.size
    && [...leftKeys].every((key) => rightKeys.has(key))
}

const slotAcceptsBlock = (instance, block) => {
  const match = instance.match ?? { kind: 'exact_block' }
  switch (match.kind) {
    case 'exact_block': return blockMatchesRecipeTemplate(instance.block_id, block)
    case 'any_block': return true
    case 'type': return block.typeId === match.type_id
    case 'color': return block.color === match.color_id
    case 'tag': return block.tags?.includes(match.tag)
    default: return false
  }
}

export const getBlueprintLayout = (combination) => {
  const slots = combination.instances.map((instance) => {
    const definition = BLOCK_RULE_INDEX.blocks.get(instance.block_id)
    return {
      ...instance,
      cells: transformCells(definition.shape.cells, {
        rotation: instance.rotation,
        mirrored: instance.mirrored,
        origin: instance.origin,
      }),
    }
  })
  const normalizedCells = normalizeCells(slots.flatMap(({ cells }) => cells))
  const sourceCells = slots.flatMap(({ cells }) => cells)
  const minX = Math.min(...sourceCells.map(({ x }) => x))
  const minY = Math.min(...sourceCells.map(({ y }) => y))
  let offset = 0
  const normalizedSlots = slots.map((slot) => {
    const cells = normalizedCells.slice(offset, offset + slot.cells.length)
    offset += slot.cells.length
    return { ...slot, cells, origin: { x: slot.origin.x - minX, y: slot.origin.y - minY } }
  })
  return {
    slots: normalizedSlots,
    cells: normalizedCells,
    width: Math.max(...normalizedCells.map(({ x }) => x)) + 1,
    height: Math.max(...normalizedCells.map(({ y }) => y)) + 1,
  }
}

export const isStarterBlueprint = (combination) => {
  const { width, height } = getBlueprintLayout(combination)
  return width <= 3 && height <= 3
}

export const getKnownBlueprints = (discoveredIds = []) => {
  const discovered = new Set(discoveredIds)
  return BLOCK_RULES.combinations.filter((combination) =>
    isStarterBlueprint(combination) || discovered.has(combination.id))
}

export const getQuickCombinationPlan = (combinationId, blocks) => {
  const combination = BLOCK_RULE_INDEX.combinations.get(combinationId)
  if (!combination || combination.instances.length > blocks.length) return null
  const layout = getBlueprintLayout(combination)
  const assign = (slotIndex, usedIndexes, assignments) => {
    if (slotIndex === layout.slots.length) {
      return { combination, layout, assignments }
    }
    const slot = layout.slots[slotIndex]
    const definition = BLOCK_RULE_INDEX.blocks.get(slot.block_id)
    const expectedCells = transformCells(definition.shape.cells, {
      rotation: slot.rotation,
      mirrored: slot.mirrored,
    })
    for (let index = 0; index < blocks.length; index += 1) {
      if (usedIndexes.has(index)) continue
      const block = blocks[index]
      const candidateCells = transformCells(
        block.cells.map(([x, y]) => ({ x, y })),
        { rotation: slot.rotation, mirrored: slot.mirrored },
      )
      if (!slotAcceptsBlock(slot, block) || !sameCellShape(expectedCells, candidateCells)) continue
      const result = assign(
        slotIndex + 1,
        new Set([...usedIndexes, index]),
        [...assignments, {
          blockId: block.id,
          rotation: slot.rotation,
          mirrored: slot.mirrored,
          origin: slot.origin,
        }],
      )
      if (result) return result
    }
    return null
  }
  return assign(0, new Set(), [])
}
