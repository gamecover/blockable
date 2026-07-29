import { describe, expect, it } from 'vitest'
import { getPlayerTargetSlotIds, resolvePlayerAction } from '../playerAttackSystem.js'

const monster = (slotId, currentHealth = 100, statuses = [], armor = 0) => ({
  instanceId: `monster-${slotId}`,
  slotId,
  currentHealth,
  health: 100,
  armor,
  statuses,
})

const effects = ({
  base = 10,
  independent = 5,
  independentRange = 'single',
  hitCountModifier = 0,
} = {}) => ({
  baseDamageEffects: [{ target: 'enemy', range: 'single', distance: 0, amount: base }],
  independentDamageEffects: [{
    target: 'enemy',
    range: independentRange,
    distance: independentRange === 'all' ? 1 : 0,
    amount: independent,
  }],
  hitCountModifier,
  statuses: [],
})

describe('player attack formula', () => {
  it('previews the occupied slots included by the selected attack range', () => {
    expect(getPlayerTargetSlotIds({
      combatants: [monster(1), monster(2), monster(4)],
      selectedMonsterId: 'monster-2',
      battleType: 'normal',
      effects: effects({ independentRange: 'all' }),
    }).sort()).toEqual([1, 2, 4])
  })

  it('applies P, H, and W to each base hit, then resolves A independently', () => {
    const result = resolvePlayerAction({
      combatants: [monster(1, 100, [{ id: 'wound', stacks: 1 }], 5)],
      selectedMonsterId: 'monster-1',
      battleType: 'normal',
      effects: effects({ hitCountModifier: 1 }),
      playerStatuses: [
        { id: 'rage', stacks: 3 },
        { id: 'weakness', stacks: 2 },
      ],
    })

    expect(result).toMatchObject({
      baseAttackPerHit: 13,
      independentDamage: 5,
      hitCount: 2,
      baseAttackCancelled: false,
    })
    expect(result.combatants[0]).toMatchObject({ armor: 0, currentHealth: 79 })
    expect(result.damageBySlot.get(1)).toBe(26)
  })

  it('stops remaining base hits without retargeting when the center dies', () => {
    const result = resolvePlayerAction({
      combatants: [monster(1, 8), monster(2)],
      selectedMonsterId: 'monster-1',
      battleType: 'normal',
      effects: effects({ hitCountModifier: 2 }),
    })

    expect(result.baseAttackCancelled).toBe(true)
    expect(result.combatants.map(({ currentHealth }) => currentHealth)).toEqual([0, 100])
    expect(result.damageBySlot.get(1)).toBe(10)
  })

  it('lets an all-target A attack use its own targeting after the base target dies', () => {
    const result = resolvePlayerAction({
      combatants: [monster(1, 8), monster(2)],
      selectedMonsterId: 'monster-1',
      battleType: 'normal',
      effects: effects({ independentRange: 'all' }),
    })

    expect(result.combatants.map(({ currentHealth }) => currentHealth)).toEqual([0, 95])
    expect(result.damageBySlot.get(2)).toBe(5)
  })

  it('cancels remaining attacks immediately when slot 5 boss dies', () => {
    const result = resolvePlayerAction({
      combatants: [monster(1), monster(5, 8)],
      selectedMonsterId: 'monster-5',
      battleType: 'boss',
      effects: effects({ independentRange: 'all', hitCountModifier: 2 }),
    })

    expect(result.bossDefeated).toBe(true)
    expect(result.combatants.map(({ currentHealth }) => currentHealth)).toEqual([100, 0])
    expect(result.damageBySlot.has(1)).toBe(false)
  })

  it('applies ranged debuffs and crowd control to every resolved target slot', () => {
    const rangedEffects = effects()
    rangedEffects.statuses = [{
      id: 'weakness',
      sourceId: 'ATTACK_REDUCTION',
      value: 0.1,
      duration: 0,
      intensify: 2,
      range: 'both',
      distance: 1,
    }, {
      id: 'stun',
      sourceId: 'STUN',
      value: 0,
      duration: 1,
      intensify: 1,
      range: 'all',
      distance: 0,
    }]

    const result = resolvePlayerAction({
      combatants: [monster(1), monster(2), monster(3)],
      selectedMonsterId: 'monster-2',
      battleType: 'normal',
      effects: rangedEffects,
    })

    expect(result.combatants.map(({ statuses }) =>
      statuses.map(({ id }) => id).sort())).toEqual([
      ['stun', 'weakness'],
      ['stun', 'weakness'],
      ['stun', 'weakness'],
    ])
  })
})
