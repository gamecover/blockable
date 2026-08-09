import { describe, expect, it } from 'vitest'
import {
  STATUS_EFFECTS,
  addStatusUpdate,
  calculateGeneralDamage,
  consumeStun,
  createCombatantState,
  createStatusUpdateFromEffect,
  getArmorGainBonus,
  getBuffDamageBonus,
  getPoisonPlacementDamage,
  resolveTurnEndStatuses,
} from '../statusEffectSystem.js'

const update = (id, value) => ({ id, value, intensify: value, duration: 0 })

describe('combat system 0.5.4 status effects', () => {
  it('registers three damage-over-time, three debuff, two buff, and one control effect', () => {
    const categories = Object.values(STATUS_EFFECTS).map(({ category }) => category)
    expect(categories.filter((category) => category === 'damage')).toHaveLength(3)
    expect(categories.filter((category) => category === 'debuff')).toHaveLength(3)
    expect(categories.filter((category) => category === 'buff')).toHaveLength(2)
    expect(categories.filter((category) => category === 'control')).toHaveLength(1)
  })

  it('keeps unassigned combat attributes at their neutral source-of-truth values', () => {
    expect(createCombatantState().attributes).toEqual({ strength: null, dexterity: null })
  })

  it('uses effect value as the stack count and ignores duration and intensify', () => {
    expect(createStatusUpdateFromEffect({
      type: 'DAMAGE_OVER_TIME',
      value: 5,
      parameters: { id: 'BURN', duration: 99, intensify: 2 },
    })).toMatchObject({ id: 'burn', stacks: 5, value: 5, intensify: 5 })
  })

  it('applies player bleeding by placed block objects and ignores armor', () => {
    const statuses = addStatusUpdate([], update('bleeding', 2))
    expect(resolveTurnEndStatuses({
      owner: 'player', health: 20, armor: 5, statuses, playerPlacedBlockCount: 3,
    })).toMatchObject({ health: 14, armor: 5, damage: 6, statuses: [{ stacks: 1 }] })
  })

  it('applies monster bleeding as stacks times three and then removes one stack', () => {
    const statuses = addStatusUpdate([], update('bleeding', 2))
    expect(resolveTurnEndStatuses({
      owner: 'monster', health: 20, armor: 5, statuses,
    })).toMatchObject({ health: 14, armor: 5, damage: 6, statuses: [{ stacks: 1 }] })
  })

  it('lets armor absorb burn before halving its stacks', () => {
    const statuses = addStatusUpdate([], update('burn', 5))
    expect(resolveTurnEndStatuses({ health: 20, armor: 2, statuses })).toMatchObject({
      health: 17, armor: 0, damage: 3, statuses: [{ id: 'burn', stacks: 2 }],
    })
  })

  it('reports the lethal status event separately from the total turn-end damage', () => {
    const statuses = addStatusUpdate(
      addStatusUpdate([], update('bleeding', 2)),
      update('burn', 5),
    )
    const result = resolveTurnEndStatuses({
      owner: 'player', health: 6, armor: 0, statuses, playerPlacedBlockCount: 1,
    })

    expect(result.health).toBe(0)
    expect(result.damageEvents).toEqual([
      { statusId: 'bleeding', damage: 2, healthAfter: 4 },
      { statusId: 'burn', damage: 4, healthAfter: 0 },
    ])
  })

  it('retains the monster that applied a lethal damage-over-time status', () => {
    const statuses = addStatusUpdate([], {
      ...update('burn', 5),
      sourceName: '잉걸불 슬라임',
    })
    const result = resolveTurnEndStatuses({
      owner: 'player', health: 4, armor: 0, statuses, playerPlacedBlockCount: 1,
    })

    expect(result.damageEvents).toEqual([{
      statusId: 'burn', sourceName: '잉걸불 슬라임', damage: 4, healthAfter: 0,
    }])
  })

  it('protects newly applied poison until next turn and then halves it', () => {
    const newlyApplied = addStatusUpdate([], update('poison', 5), true)
    expect(getPoisonPlacementDamage(newlyApplied)).toBe(0)
    const activated = resolveTurnEndStatuses({ owner: 'player', health: 20, statuses: newlyApplied })
    expect(activated.statuses).toMatchObject([{ id: 'poison', stacks: 5 }])
    expect(getPoisonPlacementDamage(activated.statuses, 2)).toBe(4)
    expect(resolveTurnEndStatuses({
      owner: 'monster', health: 30, statuses: activated.statuses,
    })).toMatchObject({ health: 15, damage: 15, statuses: [{ stacks: 2 }] })
  })

  it('protects a newly applied stack debuff once and then removes one stack each turn', () => {
    const applied = addStatusUpdate([], update('weakness', 3), true)
    const first = resolveTurnEndStatuses({ health: 20, statuses: applied })
    const second = resolveTurnEndStatuses({ health: 20, statuses: first.statuses })
    expect(first.statuses).toMatchObject([{ id: 'weakness', stacks: 3 }])
    expect(second.statuses).toMatchObject([{ id: 'weakness', stacks: 2 }])
  })

  it('calculates D and W from weakness and wound stacks', () => {
    expect(calculateGeneralDamage({
      amount: 100,
      attackerStatuses: [{ id: 'weakness', stacks: 2 }],
      defenderStatuses: [{ id: 'wound', stacks: 2 }],
    })).toBe(96)
  })

  it('activates rage and armor on the following turn and removes them at its end', () => {
    const pending = addStatusUpdate(
      addStatusUpdate([], update('rage', 3), true),
      update('armor', 4),
      true,
    )
    expect(getBuffDamageBonus(pending)).toBe(0)
    const active = resolveTurnEndStatuses({ health: 20, statuses: pending }).statuses
    expect(active).toMatchObject([{ id: 'rage', stacks: 3 }, { id: 'armor', stacks: 4 }])
    expect(getBuffDamageBonus(active)).toBe(3)
    expect(getArmorGainBonus([...active, { id: 'chill', stacks: 2 }])).toBe(2)
    expect(resolveTurnEndStatuses({ health: 20, statuses: active }).statuses).toEqual([])
  })

  it('does not stack stun and consumes it on the next action', () => {
    const first = addStatusUpdate([], update('stun', 9))
    expect(addStatusUpdate(first, update('stun', 1))).toBe(first)
    expect(consumeStun(first)).toEqual({ skipAction: true, statuses: [] })
  })
})
