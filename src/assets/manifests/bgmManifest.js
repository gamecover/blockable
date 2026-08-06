import ashenFurnaceBgm from '../sounds/bgm/ashen_furnace_bgm.mp3'
import floodedFoundryBgm from '../sounds/bgm/flooded_foundry_bgm.mp3'
import greatForgeBgm from '../sounds/bgm/great_forge_bgm.mp3'
import ashenFireDragonBgm from '../../objects/monsters/ashen_fire_dragon_of_oblivion/assets/ashen_fire_dragon_of_oblivion_bgm.mp3'
import eternalForgeGodBgm from '../../objects/monsters/god_of_the_eternal_forge/assets/god_of_the_eternal_forge_bgm.mp3'
import lavaHeartBgm from '../../objects/monsters/lava_heart/assets/lava_heart_bgm.mp3'
import moltenDrakeBgm from '../../objects/monsters/molten_drake/assets/molten_drake_bgm.mp3'
import seethingFurnaceKnightBgm from '../../objects/monsters/seething_furnace_knight/assets/seething_furnace_knight_bgm.mp3'

export const BGM_ASSETS = Object.freeze({
  'dungeon:ashen_furnace': ashenFurnaceBgm,
  'dungeon:flooded_foundry': floodedFoundryBgm,
  'dungeon:great_forge': greatForgeBgm,
  'monster:lava_heart': lavaHeartBgm,
  'monster:molten_drake': moltenDrakeBgm,
  'monster:seething_furnace_knight': seethingFurnaceKnightBgm,
  'monster:ashen_fire_dragon_of_oblivion': ashenFireDragonBgm,
  'monster:god_of_the_eternal_forge': eternalForgeGodBgm,
})

export const BGM_PRIORITY = Object.freeze({
  BACKGROUND: 1,
  MONSTER: 2,
  EVENT: 3,
})

const ASHEN_FURNACE_DUNGEON_IDS = new Set([
  'ashen-forge',
  'ashen-forge-east',
])

export const getDungeonBgmKey = (activeDungeonId) => {
  if (activeDungeonId === 'ashen-forge-west') return 'dungeon:flooded_foundry'
  if (activeDungeonId === 'great-forge') return 'dungeon:great_forge'
  if (ASHEN_FURNACE_DUNGEON_IDS.has(activeDungeonId)) return 'dungeon:ashen_furnace'
  return null
}

export const getMonsterBgmKey = (monsterId) => {
  const key = monsterId ? `monster:${monsterId}` : null
  return key && key in BGM_ASSETS ? key : null
}

export const getEventBgmKey = (eventId) => {
  const key = eventId ? `event:${eventId}` : null
  return key && key in BGM_ASSETS ? key : null
}

export const getDungeonEntryBgmKeys = (activeDungeonId) => {
  const dungeonKey = getDungeonBgmKey(activeDungeonId)
  return dungeonKey ? [dungeonKey] : []
}

export const getDungeonBackgroundBgmKeys = () =>
  Object.keys(BGM_ASSETS).filter((key) => key.startsWith('monster:'))

export const getScreenBgmRequests = ({
  screen,
  activeDungeonId,
  monsterId,
  eventId,
}) => {
  const requests = []
  if (['map', 'battle', 'reward', 'event', 'dungeonConquest'].includes(screen)) {
    const dungeonKey = getDungeonBgmKey(activeDungeonId)
    if (dungeonKey) requests.push({
      id: 'dungeon-background',
      key: dungeonKey,
      priority: BGM_PRIORITY.BACKGROUND,
    })
  }
  if (screen === 'battle' && monsterId) {
    const monsterKey = getMonsterBgmKey(monsterId)
    if (monsterKey) requests.push({
      id: 'monster-theme',
      key: monsterKey,
      priority: BGM_PRIORITY.MONSTER,
    })
  }
  if (screen === 'event' && eventId) {
    const eventKey = getEventBgmKey(eventId)
    if (eventKey) requests.push({
      id: 'event-theme',
      key: eventKey,
      priority: BGM_PRIORITY.EVENT,
    })
  }
  return requests
}

export const getScreenBgmKey = (context) => getScreenBgmRequests(context)
  .sort((left, right) => right.priority - left.priority)[0]?.key ?? null
