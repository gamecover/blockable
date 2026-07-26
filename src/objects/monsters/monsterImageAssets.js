import ashenBatImage from './cinder_bat/assets/ashen_bat.png'
import seethingFurnaceKnightImage from './seething_furnace_knight/assets/seething_furnace_knight.png'
import emberSlimeImage from './ember_slime/assets/ember_slime_alpha.png'
import explosionSoulImage from './explosive_soul/assets/explosion_soul.png'
import flameGhoulImage from './flame_ghoul/assets/flame_ghoul_alpha.png'
import lavaHeartImage from './lava_heart/assets/lava_heart.png'
import rustedGolemImage from './rusty_golem/assets/rusted golem.png'

const MONSTER_IMAGE_ASSETS = Object.freeze({
  'ashen_bat.png': ashenBatImage,
  'seething_furnace_knight.png': seethingFurnaceKnightImage,
  'ember_slime_alpha.png': emberSlimeImage,
  'explosion_soul.png': explosionSoulImage,
  'flame_ghoul_alpha.png': flameGhoulImage,
  'lava_heart.png': lavaHeartImage,
  'rusted golem.png': rustedGolemImage,
})

export const getMonsterImageAsset = (resourceId) =>
  MONSTER_IMAGE_ASSETS[resourceId] ?? null
