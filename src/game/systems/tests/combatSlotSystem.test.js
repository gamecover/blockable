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

  it('spawns exactly one normal monster in a normal battle', () => {
    const combat = createCombatSlots({
      node: { type: 'battle', grade: 'normal' },
      floor: 1,
      difficultyTier: 1,
      random: () => 0.999,
    })

    expect(combat.battleType).toBe('normal')
    expect(combat.monsters.map(({ slotId }) => slotId)).toEqual([1])
  })

  it('spawns two to three normal monsters when no elite is available', () => {
    const minimum = createCombatSlots({
      node: { type: 'elite', grade: 'elite' },
      floor: 1,
      difficultyTier: 1,
      random: () => 0,
    })
    const maximum = createCombatSlots({
      node: { type: 'elite', grade: 'elite' },
      floor: 1,
      difficultyTier: 1,
      random: () => 0.999,
    })

    expect(minimum.monsters.map(({ slotId }) => slotId)).toEqual([1, 2])
    expect(maximum.monsters.map(({ slotId }) => slotId)).toEqual([1, 2, 3])
  })

  it('spawns one elite monster when an elite is available', () => {
    const combat = createCombatSlots({
      node: { type: 'elite', grade: 'elite' },
      floor: 2,
      difficultyTier: 1,
      random: () => 0,
    })

    expect(combat.monsters).toHaveLength(1)
    expect(combat.monsters[0].grade).toBe('elite')
  })

  it('spawns only two to three horde monsters in a horde battle', () => {
    const minimum = createCombatSlots({
      node: { type: 'battle', grade: 'horde' },
      floor: 1,
      difficultyTier: 1,
      random: () => 0,
    })
    const maximum = createCombatSlots({
      node: { type: 'battle', grade: 'horde' },
      floor: 1,
      difficultyTier: 1,
      random: () => 0.999,
    })

    expect(minimum.monsters).toHaveLength(2)
    expect(maximum.monsters).toHaveLength(3)
    ;[...minimum.monsters, ...maximum.monsters].forEach((monster) => {
      expect(monster.grade).toBe('horde')
      expect(['scrap_amalgam', 'burning_worm', 'slag_imp']).toContain(monster.id)
    })
  })

  it('uses the prototype horde pool on every floor regardless of Designer appearance conditions', () => {
    const combat = createCombatSlots({
      node: { type: 'battle', grade: 'horde' },
      floor: 3,
      difficultyTier: 1,
      random: () => 0,
    })

    expect(combat.monsters).toHaveLength(2)
    expect(combat.monsters.every(({ grade }) => grade === 'horde')).toBe(true)
    expect(combat.monsters.every(({ id }) =>
      ['scrap_amalgam', 'burning_worm', 'slag_imp'].includes(id))).toBe(true)
  })

  it('keeps prototype horde candidates out of normal encounters', () => {
    const hordeIds = new Set(['scrap_amalgam', 'burning_worm', 'slag_imp'])
    const combat = createCombatSlots({
      node: { type: 'battle', grade: 'normal' },
      floor: 3,
      difficultyTier: 1,
      random: () => 0.999,
    })

    expect(combat.monsters).toHaveLength(1)
    expect(hordeIds.has(combat.monsters[0].id)).toBe(false)
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

  it('prefers an unencountered boss and restarts only after the available pool is exhausted', () => {
    const first = createCombatSlots({
      node: { type: 'boss', grade: 'boss' },
      floor: 2,
      difficultyTier: 1,
      bossEncounterHistory: [],
      random: () => 0,
    })
    const second = createCombatSlots({
      node: { type: 'boss', grade: 'boss' },
      floor: 2,
      difficultyTier: 1,
      bossEncounterHistory: [first.bossEncounterId],
      random: () => 0,
    })
    const reset = createCombatSlots({
      node: { type: 'boss', grade: 'boss' },
      floor: 2,
      difficultyTier: 1,
      bossEncounterHistory: [first.bossEncounterId, second.bossEncounterId],
      random: () => 0,
    })

    expect(second.bossEncounterId).not.toBe(first.bossEncounterId)
    expect(reset.bossEncounterId).not.toBe(first.bossEncounterId)
    expect(reset.bossEncounterId).not.toBe(second.bossEncounterId)

    const restarted = createCombatSlots({
      node: { type: 'boss', grade: 'boss' },
      floor: 2,
      difficultyTier: 1,
      bossEncounterHistory: [
        first.bossEncounterId,
        second.bossEncounterId,
        reset.bossEncounterId,
      ],
      random: () => 0,
    })

    expect(restarted.resetBossEncounterHistory).toBe(true)
    expect(restarted.bossEncounterId).toBe(first.bossEncounterId)
  })
})
