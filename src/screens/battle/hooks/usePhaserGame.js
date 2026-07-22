import { useEffect, useRef } from 'react'
import Phaser from 'phaser'
import { createGameConfig } from '../../../game/phaser/config/createGameConfig.js'

export const usePhaserGame = (sceneData) => {
  const mountRef = useRef(null)
  const gameRef = useRef(null)

  useEffect(() => {
    if (!mountRef.current || gameRef.current) return undefined
    gameRef.current = new Phaser.Game(createGameConfig(mountRef.current, sceneData))

    const destroyGame = () => {
      gameRef.current?.destroy(true)
      gameRef.current = null
    }

    if (import.meta.hot) import.meta.hot.dispose(destroyGame)

    return () => {
      destroyGame()
    }
  }, [sceneData])

  return mountRef
}
