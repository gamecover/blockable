import { describe, expect, it } from 'vitest'
import { discardHand, drawHand } from '../deckSystem.js'

describe('deck system', () => {
  it('draws five and reshuffles discard when needed', () => {
    const blocks = Array.from({ length: 6 }, (_, id) => ({ id }))
    const first = drawHand({ drawPile: blocks.slice(0, 2), hand: [], discardPile: blocks.slice(2) }, 5, () => 0.5)
    expect(first.hand).toHaveLength(5)
    expect(first.drawPile).toHaveLength(1)
    expect(first.discardPile).toHaveLength(0)
  })
  it('moves the full hand to discard', () => {
    const result = discardHand({ drawPile: [{ id: 1 }], hand: [{ id: 2 }], discardPile: [{ id: 3 }] })
    expect(result.discardPile.map(({ id }) => id)).toEqual([3, 2])
  })
})
