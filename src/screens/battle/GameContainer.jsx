import { usePhaserGame } from './hooks/usePhaserGame.js'

export function GameContainer({ hand, health, developerMode = false }) {
  const mountRef = usePhaserGame(
    { hand, health, developerMode },
    hand,
  )
  return <div className="game-canvas" ref={mountRef} aria-label="블록 배치 퍼즐판" />
}
