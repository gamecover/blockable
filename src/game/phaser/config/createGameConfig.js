import Phaser from 'phaser'
import { BattleScene } from '../scenes/BattleScene.js'

export const createGameConfig = (parent, sceneData) => ({
  type: Phaser.AUTO,
  banner: false,
  parent,
  width: 820,
  height: 500,
  backgroundColor: 'rgba(0,0,0,0)',
  transparent: true,
  scene: [],
  physics: { default: 'arcade' },
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  callbacks: { postBoot: (game) => game.scene.add('battle', BattleScene, true, sceneData) },
})
