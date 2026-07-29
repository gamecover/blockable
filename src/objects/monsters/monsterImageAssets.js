import ashenBatImage from './cinder_bat/assets/ashen_bat.png'
import seethingFurnaceKnightImage from './seething_furnace_knight/assets/seething_furnace_knight.png'
import emberSlimeImage from './ember_slime/assets/ember_slime_alpha.png'
import explosionSoulImage from './explosive_soul/assets/explosion_soul.png'
import flameGhoulImage from './flame_ghoul/assets/flame_ghoul_alpha.png'
import lavaHeartImage from './lava_heart/assets/lava_heart.png'
import rustedGolemImage from './rusty_golem/assets/rusted golem.png'

const MONSTER_IMAGE_ASSETS = Object.freeze({
  cinder_bat: ashenBatImage,
  seething_furnace_knight: seethingFurnaceKnightImage,
  ember_slime: emberSlimeImage,
  explosive_soul: explosionSoulImage,
  flame_ghoul: flameGhoulImage,
  lava_heart: lavaHeartImage,
  rusty_golem: rustedGolemImage,
})

export const hasMonsterImageAsset = (monsterId) => monsterId in MONSTER_IMAGE_ASSETS
export const getMonsterImageAsset = (monsterId) => MONSTER_IMAGE_ASSETS[monsterId] ?? null
