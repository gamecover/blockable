import { useEffect, useRef } from 'react'
import Phaser from 'phaser'
import { createGameConfig } from '../../../game/phaser/config/createGameConfig.js'

export const usePhaserGame = (sceneData) => {
  const mountRef = useRef(null)
  const gameRef = useRef(null)

  useEffect(() => {
    if (!mountRef.current || gameRef.current) return undefined
    gameRef.current = new Phaser.Game(createGameConfig(mountRef.current, sceneData))

    return () => {
      gameRef.current?.destroy(true)
      gameRef.current = null
    }
  }, [sceneData])

  return mountRef
}
