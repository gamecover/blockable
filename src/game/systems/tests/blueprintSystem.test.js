import { describe, expect, it } from 'vitest'
import { createBlock } from '../../../objects/blocks/blockData.js'
import {
  getBlueprintLayout,
  getBlueprintCatalog,
  getDefaultDiscoveredBlueprintIds,
  getKnownBlueprints,
  getQuickCombinationPlan,
  isStarterBlueprint,
} from '../blueprintSystem.js'
import { BLOCK_RULE_INDEX, BLOCK_RULES } from '../blockRulesSystem.js'

describe('blueprint system', () => {
  it('reveals every normal-block recipe that fits within a 3 by 3 area by default', () => {
    const catalog = getBlueprintCatalog()
    const defaultIds = getDefaultDiscoveredBlueprintIds()
    const known = getKnownBlueprints([])

    expect(catalog.length).toBe(BLOCK_RULES.combinations.length)
    expect(known.map(({ id }) => id)).toEqual(defaultIds)
    expect(known.every((combination) => {
      const layout = getBlueprintLayout(combination)
      return isStarterBlueprint(combination) && layout.width <= 3 && layout.height <= 3
    })).toBe(true)
  })

  it('keeps non-standard-block or 4 by 4 recipes hidden until discovered', () => {
    const hidden = BLOCK_RULES.combinations.find((combination) => !isStarterBlueprint(combination))

    expect(hidden).toBeDefined()
    expect(getKnownBlueprints([])).not.toContainEqual(hidden)
    expect(getKnownBlueprints([hidden.id])).toContainEqual(hidden)
  })

  it('assigns distinct real hand blocks to a quick combination', () => {
    const recipe = BLOCK_RULE_INDEX.combinations.get('base_33_01')
    const blocks = [
      createBlock('s001', 'quick-1'),
      createBlock('s002', 'quick-2'),
      createBlock('s003', 'unused'),
    ]
    const plan = getQuickCombinationPlan(recipe.id, blocks)

    expect(plan.assignments).toHaveLength(recipe.instances.length)
    expect(new Set(plan.assignments.map(({ blockId }) => blockId)).size)
      .toBe(recipe.instances.length)
  })

  it('allows a known normal-block blueprint to use same-shape blocks of other colors', () => {
    const blocks = [
      createBlock('f001', 'quick-fire'),
      createBlock('w002', 'quick-water'),
    ]
    const plan = getQuickCombinationPlan('base_33_01', blocks)

    expect(plan).not.toBeNull()
    expect(plan.assignments).toHaveLength(2)
  })

  it('does not create a quick plan when required hand blocks are missing', () => {
    const blocks = [createBlock('s003', 'only-one')]

    expect(getQuickCombinationPlan('base_33_01', blocks)).toBeNull()
  })
})
