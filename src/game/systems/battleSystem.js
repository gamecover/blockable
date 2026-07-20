import { BASE_BLOCK_DAMAGE } from '../constants/gameConfig.js'

export const resolvePlayerTurn = ({ placedCount, occupiedCells, totalBoardCells }) => {
  const baseDamage = placedCount * BASE_BLOCK_DAMAGE
  const boardComplete = occupiedCells === totalBoardCells
  return { damage: baseDamage + (boardComplete ? 20 : 0), boardComplete }
}

export const applyDamage = (health, damage, armor = 0) => ({
  health: Math.max(0, health - Math.max(0, damage - armor)),
  armor: Math.max(0, armor - damage),
})
