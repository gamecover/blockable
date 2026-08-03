import { useEffect } from 'react'
import { usePhaserGame } from './hooks/usePhaserGame.js'
import { GAME_EVENTS, gameBridge } from '../../game/events/gameEvents.js'
import {
  getAttackPowerMultiplier,
  getAttackReductionMultiplier,
  getBuffDamageBonus,
  getHitCountBonus,
  getWoundMultiplier,
} from '../../game/systems/statusEffectSystem.js'

export function GameContainer({
  hand,
  health,
  armor,
  playerStatuses = [],
  targetStatuses = [],
  developerMode = false,
  tutorialMode = false,
  knownBlueprintIds = [],
}) {
  const mountRef = usePhaserGame(
    { hand, health, armor, developerMode, tutorialMode, knownBlueprintIds },
    hand,
  )

  useEffect(() => {
    gameBridge.emit(GAME_EVENTS.BOARD_HEALTH_CHANGED, { health })
  }, [health])

  useEffect(() => {
    gameBridge.emit(GAME_EVENTS.BOARD_ARMOR_CHANGED, { armor })
  }, [armor])

  useEffect(() => {
    gameBridge.emit(GAME_EVENTS.BOARD_COMBAT_CONTEXT_CHANGED, {
      damageBonus: getBuffDamageBonus(playerStatuses),
      attackMultiplier: getAttackPowerMultiplier(playerStatuses),
      attackReductionMultiplier: getAttackReductionMultiplier(playerStatuses),
      woundMultiplier: getWoundMultiplier(targetStatuses),
      hitCountBonus: getHitCountBonus(playerStatuses),
    })
  }, [playerStatuses, targetStatuses])

  return (
    <div className="game-canvas" ref={mountRef} data-tutorial-target="forge" aria-label="블록 배치 퍼즐판">
      <span className="game-canvas__tutorial-board" data-tutorial-target="forge-board" aria-hidden="true" />
    </div>
  )
}
