import ashenFurnaceBgm from '../sounds/bgm/ashen_furnace_bgm.mp3'
import ashenFireDragonBgm from '../../objects/monsters/ashen_fire_dragon_of_oblivion/assets/ashen_fire_dragon_of_oblivion_bgm.mp3'
import eternalForgeGodBgm from '../../objects/monsters/god_of_the_eternal_forge/assets/god_of_the_eternal_forge_bgm.mp3'
import lavaHeartBgm from '../../objects/monsters/lava_heart/assets/lava_heart_bgm.mp3'
import moltenDrakeBgm from '../../objects/monsters/molten_drake/assets/molten_drake_bgm.mp3'
import seethingFurnaceKnightBgm from '../../objects/monsters/seething_furnace_knight/assets/seething_furnace_knight_bgm.mp3'

export const BGM_ASSETS = Object.freeze({
  'dungeon:ashen_furnace': ashenFurnaceBgm,
  'monster:lava_heart': lavaHeartBgm,
  'monster:molten_drake': moltenDrakeBgm,
  'monster:seething_furnace_knight': seethingFurnaceKnightBgm,
  'monster:ashen_fire_dragon_of_oblivion': ashenFireDragonBgm,
  'monster:god_of_the_eternal_forge': eternalForgeGodBgm,
})

const ASHEN_FURNACE_DUNGEON_IDS = new Set([
  'ashen-forge',
  'ashen-forge-west',
  'ashen-forge-east',
  'great-forge',
])

const getDungeonBgmKey = (activeDungeonId) =>
  ASHEN_FURNACE_DUNGEON_IDS.has(activeDungeonId)
    ? 'dungeon:ashen_furnace'
    : null

export const getScreenBgmKey = ({
  screen,
  activeDungeonId,
  monsterId,
}) => {
  if (screen === 'battle' && monsterId) {
    const monsterKey = `monster:${monsterId}`
    if (monsterKey in BGM_ASSETS) return monsterKey
  }
  if (['map', 'battle', 'reward', 'event', 'dungeonConquest'].includes(screen)) {
    return getDungeonBgmKey(activeDungeonId)
  }
  return null
}

