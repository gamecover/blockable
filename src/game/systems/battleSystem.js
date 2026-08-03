import { resolveBlockEffects } from './blockEffectSystem.js'

export const resolvePlayerTurn = ({ placedBlocks = [], occupiedCells, totalBoardCells, currentArmor = 0 }) => {
  const boardComplete = occupiedCells === totalBoardCells
  return { ...resolveBlockEffects(placedBlocks, { currentArmor }), boardComplete }
}

export const applyDamage = (health, damage, armor = 0) => ({
  health: Math.max(0, health - Math.max(0, damage - armor)),
  armor: Math.max(0, armor - damage),
})
