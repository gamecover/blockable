import { useMemo } from 'react'
import { usePhaserGame } from './hooks/usePhaserGame.js'

export function GameContainer({ hand, health, developerMode = false }) {
  const sceneData = useMemo(() => ({ hand, health, developerMode }), [developerMode, hand, health])
  const mountRef = usePhaserGame(sceneData)
  return <div className="game-canvas" ref={mountRef} aria-label="블록 배치 퍼즐판" />
}
