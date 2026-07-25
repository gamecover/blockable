import { describe, expect, it } from 'vitest'
import {
  addStatus,
  applyWeakness,
  applyWound,
  consumeStun,
  createCombatantState,
  resolveTurnEndStatuses,
} from '../statusEffectSystem.js'

describe('status effects', () => {
  it('defines attributes without assigning balance values', () => {
    expect(createCombatantState().attributes).toEqual({ strength: null, dexterity: null })
  })

  it('resolves bleeding from placed blocks, absorbs burn with armor, and decays stacks', () => {
    const statuses = addStatus(addStatus([], 'bleeding', 2), 'burn', 3)
    expect(resolveTurnEndStatuses({ health: 20, armor: 2, placedCount: 3, statuses })).toEqual({
      health: 13,
      armor: 0,
      damage: 7,
      statuses: [{ id: 'bleeding', stacks: 1 }, { id: 'burn', stacks: 1 }],
    })
  })

  it('applies weakness, wound, and one-action stun rules', () => {
    expect(applyWeakness(100, [{ id: 'weakness', stacks: 2 }])).toBe(80)
    expect(applyWound(100, [{ id: 'wound', stacks: 3 }])).toBe(130)
    expect(consumeStun([{ id: 'stun', stacks: 1 }])).toEqual({
      skipAction: true,
      statuses: [],
    })
    expect(addStatus([{ id: 'stun', stacks: 1 }], 'stun', 2)).toEqual([
      { id: 'stun', stacks: 1 },
    ])
  })
})
