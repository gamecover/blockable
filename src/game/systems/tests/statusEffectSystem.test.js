import { describe, expect, it } from 'vitest'
import {
  STATUS_EFFECTS,
  addStatus,
  addStatusUpdate,
  applyWound,
  calculateGeneralDamage,
  consumeStun,
  createCombatantState,
  resolveTurnEndStatuses,
} from '../statusEffectSystem.js'

describe('status effects', () => {
  it('기획안의 상태 이상 2종, 디버프 2종, 군중 제어 1종을 분류한다', () => {
    const categories = Object.values(STATUS_EFFECTS).map(({ category }) => category)
    expect(categories.filter((category) => category === 'damage')).toHaveLength(2)
    expect(categories.filter((category) => category === 'debuff')).toHaveLength(2)
    expect(categories.filter((category) => category === 'control')).toHaveLength(1)
  })

  it('defines attributes without assigning balance values', () => {
    expect(createCombatantState().attributes).toEqual({ strength: null, dexterity: null })
  })

  it('resolves bleeding before stack-based burn and lets armor absorb burn', () => {
    const statuses = addStatusUpdate(addStatusUpdate([], {
      id: 'bleeding', value: 2, duration: 1, intensify: 3,
    }), {
      id: 'burn', value: 3, duration: 1, intensify: 2,
    })
    expect(resolveTurnEndStatuses({ health: 20, armor: 2, statuses })).toEqual({
      health: 14,
      armor: 0,
      damage: 6,
      statuses: [],
    })
  })

  it('uses placed block count × stacks for player bleeding', () => {
    const statuses = addStatusUpdate([], {
      id: 'bleeding', value: 0, duration: 2, intensify: 2,
    })

    expect(resolveTurnEndStatuses({
      health: 20,
      armor: 5,
      statuses,
      playerPlacedBlockCount: 3,
    })).toMatchObject({
      health: 14,
      armor: 5,
      damage: 6,
      statuses: [{ id: 'bleeding', stacks: 1 }],
    })
  })

  it('keeps value × stacks for monster bleeding', () => {
    const statuses = addStatusUpdate([], {
      id: 'bleeding', value: 5, duration: 2, intensify: 2,
    })

    expect(resolveTurnEndStatuses({
      health: 20,
      statuses,
    })).toMatchObject({
      health: 10,
      damage: 10,
      statuses: [{ id: 'bleeding', stacks: 1 }],
    })
  })

  it('uses placed block count for value-zero bleeding applied to monsters', () => {
    const statuses = addStatusUpdate([], {
      id: 'bleeding', value: 0, duration: 2, intensify: 2,
    })

    expect(resolveTurnEndStatuses({
      health: 20,
      statuses,
      placedBlockCount: 3,
    })).toMatchObject({
      health: 14,
      damage: 6,
      statuses: [{ id: 'bleeding', stacks: 1 }],
    })
  })

  it('stops remaining turn-end statuses when bleeding defeats the combatant', () => {
    const statuses = addStatusUpdate(addStatusUpdate([], {
      id: 'bleeding', value: 3, duration: 1, intensify: 2,
    }), {
      id: 'burn', value: 6, duration: 1, intensify: 1,
    })
    expect(resolveTurnEndStatuses({ health: 5, armor: 3, statuses })).toEqual({
      health: 0,
      armor: 3,
      damage: 6,
      statuses: [{
        id: 'burn',
        stacks: 1,
        layers: [{ value: 6, intensify: 1, remainingTurns: 1 }],
      }],
    })
  })

  it('preserves newly applied weakness and wound stacks that have not affected damage yet', () => {
    const statuses = addStatus(
      addStatus([{ id: 'weakness', stacks: 2 }], 'weakness', 3, true),
      'wound',
      2,
      true,
    )
    expect(resolveTurnEndStatuses({ health: 20, statuses })).toMatchObject({
      statuses: [
        { id: 'weakness', stacks: 4 },
        { id: 'wound', stacks: 2 },
      ],
    })
  })

  it('starts M and D at 1 and recalculates D and W from active effects', () => {
    expect(applyWound(100, [{ id: 'wound', stacks: 3 }])).toBe(130)
    expect(calculateGeneralDamage({
      amount: 100,
      attackerStatuses: addStatusUpdate([], {
        id: 'weakness', value: 0.1, duration: 0, intensify: 2,
      }),
      defenderStatuses: addStatusUpdate([], {
        id: 'wound', value: 10, duration: 0, intensify: 2,
      }),
    })).toBe(96)
    expect(consumeStun([{ id: 'stun', stacks: 1 }])).toEqual({
      skipAction: true,
      statuses: [],
    })
    expect(addStatus([{ id: 'stun', stacks: 1 }], 'stun', 2)).toEqual([
      { id: 'stun', stacks: 1 },
    ])
  })

  it('does not stack or refresh crowd control while it is active', () => {
    const first = addStatusUpdate([], {
      id: 'stun', value: 99, duration: 8, intensify: 7,
    })
    const second = addStatusUpdate(first, {
      id: 'stun', value: 1, duration: 1, intensify: 1,
    })
    expect(second).toBe(first)
    expect(first).toEqual([{
      id: 'stun',
      stacks: 1,
      layers: [{ value: 99, intensify: 1, remainingTurns: 1 }],
    }])
  })

  it('treats 10 and 0.1 as the same debuff rate', () => {
    const percent = addStatusUpdate([], {
      id: 'weakness', value: 10, duration: 0, intensify: 2,
    })
    const decimal = addStatusUpdate([], {
      id: 'weakness', value: 0.1, duration: 0, intensify: 2,
    })
    expect(calculateGeneralDamage({ amount: 100, attackerStatuses: percent })).toBe(80)
    expect(calculateGeneralDamage({ amount: 100, attackerStatuses: decimal })).toBe(80)
  })

  it('keeps battle-long and permanent duration layers from automatically expiring', () => {
    const statuses = addStatusUpdate(addStatusUpdate([], {
      id: 'rage', value: 2, duration: -1, intensify: 1,
    }), {
      id: 'rage', value: 3, duration: -2, intensify: 1,
    })

    expect(resolveTurnEndStatuses({
      health: 20,
      statuses,
    }).statuses).toMatchObject([{
      id: 'rage',
      stacks: 2,
      layers: [
        { remainingTurns: null, durationMode: 'battle' },
        { remainingTurns: null, durationMode: 'permanent' },
      ],
    }])
  })

  it('halves burn stacks after dealing pre-reduction stack damage', () => {
    const statuses = addStatusUpdate([], {
      id: 'burn', value: 99, duration: 3, intensify: 5,
    })

    expect(resolveTurnEndStatuses({
      health: 20,
      armor: 2,
      statuses,
    })).toMatchObject({
      health: 17,
      armor: 0,
      damage: 3,
      statuses: [{ id: 'burn', stacks: 2 }],
    })
  })
})
