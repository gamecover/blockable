import { BLOCK_RULE_INDEX, BLOCK_RULES, cellKey, normalizeCells, transformCells } from './blockRulesSystem.js'

const sameCells = (left, right) =>
  left.size === right.size && [...left].every((key) => right.has(key))

const combinationsOf = (items, size, start = 0, selected = []) => {
  if (selected.length === size) return [selected]
  const combinations = []
  for (let index = start; index <= items.length - (size - selected.length); index += 1) {
    combinations.push(...combinationsOf(items, size, index + 1, [...selected, items[index]]))
  }
  return combinations
}

const slotAcceptsBlock = (slot, placedBlock) => {
  const ruleBlock = placedBlock.block
  switch (slot.match?.kind ?? 'exact_block') {
    case 'exact_block': return ruleBlock.definitionId === slot.block_id
    case 'any_block': return true
    case 'type': return ruleBlock.typeId === slot.match.type_id
    case 'color': return ruleBlock.color === slot.match.color_id
    case 'tag': return ruleBlock.tags.includes(slot.match.tag)
    default: return false
  }
}

const createRecipeVariant = (combination, rotation, mirrored) => {
  const slots = combination.instances.map((instance) => {
    const block = BLOCK_RULE_INDEX.blocks.get(instance.block_id)
    const instanceCells = transformCells(block.shape.cells, {
      rotation: instance.rotation,
      mirrored: instance.mirrored,
      origin: instance.origin,
    })
    return { ...instance, cells: instanceCells }
  })
  const allCells = slots.flatMap(({ cells }) => cells)
  const transformedAll = transformCells(allCells, { rotation, mirrored, normalize: false })
  const minX = Math.min(...transformedAll.map(({ x }) => x))
  const minY = Math.min(...transformedAll.map(({ y }) => y))
  let offset = 0
  return slots.map((slot) => {
    const transformed = transformedAll.slice(offset, offset + slot.cells.length)
      .map(({ x, y }) => ({ x: x - minX, y: y - minY }))
    offset += slot.cells.length
    return { ...slot, cellSet: new Set(transformed.map(cellKey)) }
  })
}

const matchesVariant = (placedBlocks, slots) => {
  const normalizedAll = normalizeCells(placedBlocks.flatMap(({ cells }) => cells))
  const minX = Math.min(...placedBlocks.flatMap(({ cells }) => cells).map(({ x }) => x))
  const minY = Math.min(...placedBlocks.flatMap(({ cells }) => cells).map(({ y }) => y))
  if (!normalizedAll.length) return false
  const placedCellSet = new Set(normalizedAll.map(cellKey))
  const recipeCellSet = new Set(slots.flatMap(({ cellSet }) => [...cellSet]))
  if (!sameCells(placedCellSet, recipeCellSet)) return false
  const candidates = placedBlocks.map((placedBlock) => ({
    ...placedBlock,
    cellSet: new Set(placedBlock.cells.map(({ x, y }) => cellKey({ x: x - minX, y: y - minY }))),
  }))
  const assignSlot = (slotIndex, usedCandidates) => {
    if (slotIndex === slots.length) return true
    return candidates.some((candidate, candidateIndex) =>
      !usedCandidates.has(candidateIndex)
      && sameCells(slots[slotIndex].cellSet, candidate.cellSet)
      && slotAcceptsBlock(slots[slotIndex], candidate)
      && assignSlot(slotIndex + 1, new Set([...usedCandidates, candidateIndex])))
  }
  return assignSlot(0, new Set())
}

export const findMatchingCombinations = (placedBlocks) => BLOCK_RULES.combinations.flatMap((combination) => {
  if (combination.instances.length > placedBlocks.length) return []
  const rotations = combination.match_options.allow_recipe_rotation ? [0, 90, 180, 270] : [0]
  const mirrors = combination.match_options.allow_recipe_mirroring ? [false, true] : [false]
  const subsets = combinationsOf(placedBlocks, combination.instances.length)
  for (const subset of subsets) {
    for (const mirrored of mirrors) {
      for (const rotation of rotations) {
        if (matchesVariant(subset, createRecipeVariant(combination, rotation, mirrored))) {
          return [{ combination, participatingBlocks: subset }]
        }
      }
    }
  }
  return []
})

export const conditionMatches = (condition, blocks) => {
  const parameters = condition.parameters ?? {}
  const colors = blocks.map(({ block }) => block.color)
  const types = blocks.map(({ block }) => block.typeId)
  switch (condition.kind) {
    case 'all_same_color': {
      const sameColor = colors.length > 0 && new Set(colors).size === 1
      return sameColor && (!parameters.color_id || colors[0] === parameters.color_id)
    }
    case 'all_different_colors': return new Set(colors).size === colors.length
    case 'contains_color': return colors.includes(parameters.color_id)
    case 'color_count': return colors.filter((color) => color === parameters.color_id).length === parameters.count
    case 'color_set': return [...colors].sort().join('|') === [...parameters.color_ids].sort().join('|')
    case 'same_type': return new Set(types).size === 1
    case 'block_count': return blocks.length === parameters.count
    case 'tag_match': return blocks.some(({ block }) => block.tags.includes(parameters.tag))
    default: throw new Error(`지원하지 않는 블록 효과 조건: ${condition.kind}`)
  }
}

export const getCombinationEffectStages = (matches) => {
  const recipeEffects = matches.flatMap(({ combination }) => combination.effects)
  const conditionalEffects = matches.flatMap(({ combination, participatingBlocks }) =>
    combination.conditional_effects.flatMap((entry) =>
      conditionMatches(entry.condition, participatingBlocks) ? entry.effects : []))
  const participatingBlocks = [...new Map(matches
    .flatMap((match) => match.participatingBlocks)
    .map((placedBlock) => [placedBlock.block.id, placedBlock])).values()]
  const synergyEffects = participatingBlocks.length
    ? BLOCK_RULES.color_synergies.flatMap((synergy) =>
      synergy.enabled && conditionMatches(synergy.condition, participatingBlocks) ? synergy.effects : [])
    : []
  return { recipeEffects, conditionalEffects, synergyEffects }
}

export const getCombinationEffects = (matches) => {
  const stages = getCombinationEffectStages(matches)
  return [...stages.recipeEffects, ...stages.conditionalEffects, ...stages.synergyEffects]
}
