import { describe, expect, it } from 'vitest'
import { rollGoldChest } from '../eventSystem.js'

describe('treasure chest result', () => {
  it('returns the normal gold result', () => {
    expect(rollGoldChest(() => 0.5)).toEqual({ type: 'gold', gold: 150, doubled: false })
  })

  it('returns the doubled gold result', () => {
    expect(rollGoldChest(() => 0.01)).toEqual({ type: 'gold', gold: 300, doubled: true })
  })
})
