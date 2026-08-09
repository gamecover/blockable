import { createBlock } from '../../objects/blocks/blockData.js'
import { getRewardBlockDefinitions } from './blockRulesSystem.js'

export const MAX_SHOP_TRANSACTIONS = 3
export const SHOP_CLEANUP_BASE_COST = 50
export const getShopPurchaseCost = (purchaseCount) => 50 + (Math.min(2, Math.max(0, purchaseCount)) * 25)
export const getShopCleanupCost = (cleanupCount) => SHOP_CLEANUP_BASE_COST + (Math.min(2, Math.max(0, cleanupCount)) * 50)

export const createShopOffers = (count = 4, random = Math.random) => {
  const candidates = [...getRewardBlockDefinitions()]
  for (let index = candidates.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1))
    ;[candidates[index], candidates[target]] = [candidates[target], candidates[index]]
  }
  return candidates
    .slice(0, Math.min(count, candidates.length))
    .map(({ id }, index) => createBlock(id, `shop-${index}`))
}

export const rollGoldChest = (random = Math.random) => {
  const doubled = random() < 0.05
  return { type: 'gold', gold: doubled ? 300 : 150, doubled }
}
