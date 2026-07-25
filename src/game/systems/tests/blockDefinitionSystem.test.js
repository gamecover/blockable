import { describe, expect, it } from 'vitest'
import { createStarterDeck, createUniqueBlockChoices } from '../../../objects/blocks/blockData.js'
import { BLOCK_DATA, validateBlockDefinitions } from '../blockDefinitionSystem.js'

describe('block definitions', () => {
  it('loads valid JSON block, color, effect, and combination data', () => {
    expect(validateBlockDefinitions()).toEqual({ valid: true, errors: [] })
    expect(BLOCK_DATA.colors.colors).toHaveLength(7)
  })

  it('starts with twelve fixed blocks and offers one unique block choice', () => {
    expect(createStarterDeck()).toHaveLength(12)
    expect(createUniqueBlockChoices()).toHaveLength(3)
    expect(createUniqueBlockChoices().every(({ tags }) => tags.includes('unique'))).toBe(true)
  })
})
