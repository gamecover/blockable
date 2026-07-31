import { useEffect } from 'react'
import { usePhaserGame } from './hooks/usePhaserGame.js'
import { GAME_EVENTS, gameBridge } from '../../game/events/gameEvents.js'

export function GameContainer({
  hand,
  health,
  developerMode = false,
  tutorialMode = false,
  knownBlueprintIds = [],
}) {
  const mountRef = usePhaserGame(
    { hand, health, developerMode, tutorialMode, knownBlueprintIds },
    hand,
  )

  useEffect(() => {
    gameBridge.emit(GAME_EVENTS.BOARD_HEALTH_CHANGED, { health })
  }, [health])

  return (
    <div className="game-canvas" ref={mountRef} data-tutorial-target="forge" aria-label="블록 배치 퍼즐판">
      <span className="game-canvas__tutorial-board" data-tutorial-target="forge-board" aria-hidden="true" />
    </div>
  )
}
