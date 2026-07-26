import { HAND_SIZE } from '../constants/gameConfig.js'
import { shuffle } from './randomSystem.js'

export const startBattleDeck = (deck, random = Math.random) => ({
  drawPile: shuffle(deck, random), hand: [], discardPile: [],
})

export const drawHand = (piles, count = HAND_SIZE, random = Math.random) => {
  let drawPile = [...piles.drawPile]
  let discardPile = [...piles.discardPile]
  const remainingCount = drawPile.length || discardPile.length
  const hand = []
  while (hand.length < count && (drawPile.length || discardPile.length)) {
    if (!drawPile.length) {
      drawPile = shuffle(discardPile, random)
      discardPile = []
    }
    hand.push(drawPile.shift())
  }
  return { drawPile, hand, discardPile, remainingCount }
}

export const discardHand = (piles) => ({
  drawPile: piles.drawPile,
  hand: [],
  discardPile: [...piles.discardPile, ...piles.hand],
  remainingCount: piles.remainingCount,
})
