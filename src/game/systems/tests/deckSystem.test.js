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
  it('draws three remaining blocks first and fills only two slots from the shuffled discard', () => {
    const drawPile = [{ id: 'draw-1' }, { id: 'draw-2' }, { id: 'draw-3' }]
    const discardPile = Array.from({ length: 10 }, (_, index) => ({ id: `discard-${index + 1}` }))
    const result = drawHand({ drawPile, hand: [], discardPile }, 5, () => 0)

    expect(result.hand.slice(0, 3).map(({ id }) => id)).toEqual([
      'draw-1',
      'draw-2',
      'draw-3',
    ])
    expect(result.hand.slice(3).every(({ id }) => id.startsWith('discard-'))).toBe(true)
    expect(result.hand).toHaveLength(5)
    expect(result.drawPile).toHaveLength(8)
    expect(result.discardPile).toHaveLength(0)
    expect(new Set([...result.hand, ...result.drawPile].map(({ id }) => id)).size).toBe(13)
  })
  it('moves the full hand to discard', () => {
    const result = discardHand({ drawPile: [{ id: 1 }], hand: [{ id: 2 }], discardPile: [{ id: 3 }] })
    expect(result.discardPile.map(({ id }) => id)).toEqual([3, 2])
  })
  it('draws additional blocks requested by a draw_block effect', () => {
    const blocks = Array.from({ length: 10 }, (_, id) => ({ id }))
    expect(drawHand({ drawPile: blocks, hand: [], discardPile: [] }, 7, () => 0).hand).toHaveLength(7)
  })
  it('reports the draw cycle as thirteen, eight, then three including the current hand', () => {
    const blocks = Array.from({ length: 13 }, (_, id) => ({ id }))
    const first = drawHand({ drawPile: blocks, hand: [], discardPile: [] }, 5, () => 0)
    const second = drawHand(discardHand(first), 5, () => 0)
    const third = drawHand(discardHand(second), 5, () => 0)

    expect([first.remainingCount, second.remainingCount, third.remainingCount]).toEqual([
      13,
      8,
      3,
    ])
    expect(third.hand).toHaveLength(5)
  })
})
