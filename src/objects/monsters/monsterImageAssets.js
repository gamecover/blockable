import ashenBatImage from './cinder_bat/assets/ashen_bat.png'
import seethingFurnaceKnightImage from './seething_furnace_knight/assets/seething_furnace_knight.png'
import emberSlimeImage from './ember_slime/assets/ember_slime_alpha.png'
import explosionSoulImage from './explosive_soul/assets/explosion_soul.png'
import flameGhoulImage from './flame_ghoul/assets/flame_ghoul_alpha.png'
import lavaHeartImage from './lava_heart/assets/lava_heart.png'
import rustedGolemImage from './rusty_golem/assets/rusted golem.png'
import hangingAshesImage from './hanging_ashes/assets/hanging_ashes.png'
import smogWraithImage from './smog_wraith/assets/smog_wraith.png'
import anvilGuardianImage from './anvil_guardian/assets/anvil_guardian.png'
import moltenDrakeImage from './molten_drake/assets/molten_drake.png'
import godOfTheEternalForgeImage from './god_of_the_eternal_forge/assets/god_of_the_eternal_forge.png'
import scrapAmalgamImage from './scrap_amalgam/assets/scrap_amalgam.png'
import burningWormImage from './burning_worm/assets/burning_worm.png'
import slagImpImage from './slag_imp/assets/slag_imp.png'
import cursedSpikedAegisImage from './cursed_spiked_aegis/assets/cursed_spiked_aegis.png'
import ashenFireDragonImage from './ashen_fire_dragon_of_oblivion/assets/ashen_fire_dragon_of_oblivion.png'

const MONSTER_IMAGE_ASSETS = Object.freeze({
  cinder_bat: ashenBatImage,
  seething_furnace_knight: seethingFurnaceKnightImage,
  ember_slime: emberSlimeImage,
  explosive_soul: explosionSoulImage,
  flame_ghoul: flameGhoulImage,
  lava_heart: lavaHeartImage,
  rusty_golem: rustedGolemImage,
  hanging_ashes: hangingAshesImage,
  smog_wraith: smogWraithImage,
  anvil_guardian: anvilGuardianImage,
  molten_drake: moltenDrakeImage,
  god_of_the_eternal_forge: godOfTheEternalForgeImage,
  scrap_amalgam: scrapAmalgamImage,
  burning_worm: burningWormImage,
  slag_imp: slagImpImage,
  cursed_spiked_aegis: cursedSpikedAegisImage,
  ashen_fire_dragon_of_oblivion: ashenFireDragonImage,
})

export const hasMonsterImageAsset = (monsterId) => monsterId in MONSTER_IMAGE_ASSETS
export const getMonsterImageAsset = (monsterId) => MONSTER_IMAGE_ASSETS[monsterId] ?? null
