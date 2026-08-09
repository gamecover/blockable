import { describe, expect, it } from 'vitest'
import {
  createShopOffers,
  getShopCleanupCost,
  getShopPurchaseCost,
  MAX_SHOP_TRANSACTIONS,
  rollGoldChest,
} from '../eventSystem.js'
import { STANDARD_BLOCK_TYPE_IDS } from '../blockRulesSystem.js'

describe('treasure chest result', () => {
  it('returns the normal gold result', () => {
    expect(rollGoldChest(() => 0.5)).toEqual({ type: 'gold', gold: 150, doubled: false })
  })

  it('returns the doubled gold result', () => {
    expect(rollGoldChest(() => 0.01)).toEqual({ type: 'gold', gold: 300, doubled: true })
  })
})

describe('shop offers', () => {
  it('uses separate purchase and cleanup counts for escalating prices', () => {
    expect(getShopPurchaseCost(0)).toBe(50)
    expect(getShopPurchaseCost(1)).toBe(75)
    expect(getShopPurchaseCost(2)).toBe(100)
    expect(getShopCleanupCost(0)).toBe(50)
    expect(getShopCleanupCost(1)).toBe(100)
    expect(getShopCleanupCost(2)).toBe(150)
    expect(MAX_SHOP_TRANSACTIONS).toBe(3)
  })

  it('creates four distinct standard-block offers', () => {
    const offers = createShopOffers(4, () => 0.5)

    expect(offers).toHaveLength(4)
    expect(new Set(offers.map(({ definitionId }) => definitionId)).size).toBe(4)
    expect(offers.every(({ typeId }) => STANDARD_BLOCK_TYPE_IDS.includes(typeId))).toBe(true)
  })
})
