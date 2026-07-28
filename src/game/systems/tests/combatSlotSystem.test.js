import { describe, expect, it } from 'vitest'
import { createCombatSlots, getTargetSlotIds, isCombatVictory } from '../combatSlotSystem.js'

describe('combat slots', () => {
  it('uses fixed normal slots without filling empty gaps', () => {
    expect(getTargetSlotIds({
      centerSlotId: 2,
      range: 'both',
      battleType: 'normal',
      occupiedSlotIds: [1, 2, 4],
    })).toEqual([2, 1])
  })

  it('connects every normal slot to the boss slot for range attacks', () => {
    expect(getTargetSlotIds({
      centerSlotId: 2,
      range: 'both',
      battleType: 'boss',
      occupiedSlotIds: [1, 2, 3, 5],
    }).sort()).toEqual([1, 2, 3, 5])
  })

  it('distinguishes normal and boss victory rules', () => {
    const monsters = [
      { slotId: 1, currentHealth: 10 },
      { slotId: 5, currentHealth: 0 },
    ]
    expect(isCombatVictory('normal', monsters)).toBe(false)
    expect(isCombatVictory('boss', monsters)).toBe(true)
  })

  it('fills at most two fixed slots in a normal battle', () => {
    const combat = createCombatSlots({
      node: { type: 'battle', grade: 'normal' },
      floor: 1,
      difficultyTier: 1,
      random: () => 0.999,
    })

    expect(combat.battleType).toBe('normal')
    expect(combat.monsters.map(({ slotId }) => slotId)).toEqual([1, 2])
  })

  it('uses only slot five for a boss battle', () => {
    const combat = createCombatSlots({
      node: { type: 'boss', grade: 'boss' },
      floor: 2,
      difficultyTier: 1,
      random: () => 0,
    })

    expect(combat.battleType).toBe('boss')
    expect(combat.monsters).toHaveLength(1)
    expect(combat.monsters[0].slotId).toBe(5)
  })
})
