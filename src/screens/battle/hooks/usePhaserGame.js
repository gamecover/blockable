import { useEffect, useRef } from 'react'
import Phaser from 'phaser'
import { createGameConfig } from '../../../game/phaser/config/createGameConfig.js'

export const usePhaserGame = (sceneData, restartKey = sceneData) => {
  const mountRef = useRef(null)
  const gameRef = useRef(null)
  const sceneDataRef = useRef(sceneData)
  sceneDataRef.current = sceneData

  useEffect(() => {
    if (!mountRef.current || gameRef.current) return undefined
    gameRef.current = new Phaser.Game(createGameConfig(mountRef.current, sceneDataRef.current))

    const destroyGame = () => {
      gameRef.current?.destroy(true)
      gameRef.current = null
    }

    if (import.meta.hot) import.meta.hot.dispose(destroyGame)

    return () => {
      destroyGame()
    }
  }, [restartKey])

  return mountRef
}
