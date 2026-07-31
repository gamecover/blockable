import { describe, expect, it } from 'vitest'
import {
  BGM_ASSETS,
  getDungeonBackgroundBgmKeys,
  getDungeonBgmKey,
  getDungeonEntryBgmKeys,
  getMonsterBgmKey,
  getScreenBgmKey,
} from '../bgmManifest.js'

describe('BGM manifest routing', () => {
  it('uses a monster track in battle and falls back to the dungeon track', () => {
    expect(getScreenBgmKey({
      screen: 'battle',
      activeDungeonId: 'ashen-forge-west',
      monsterId: 'lava_heart',
    })).toBe('monster:lava_heart')
    expect(getScreenBgmKey({
      screen: 'battle',
      activeDungeonId: 'ashen-forge-west',
      monsterId: 'ember_slime',
    })).toBe('dungeon:flooded_foundry')
  })

  it('uses the dungeon track inside a dungeon and stops it outside', () => {
    expect(getScreenBgmKey({
      screen: 'event',
      activeDungeonId: 'ashen-forge-west',
    })).toBe('dungeon:flooded_foundry')
    expect(getScreenBgmKey({
      screen: 'map',
      activeDungeonId: 'great-forge',
    })).toBe('dungeon:ashen_furnace')
    expect(getScreenBgmKey({
      screen: 'worldMap',
      activeDungeonId: null,
    })).toBeNull()
  })

  it('provides loadable keys for regional and monster transition screens', () => {
    expect(getDungeonBgmKey('ashen-forge-west')).toBe('dungeon:flooded_foundry')
    expect(getDungeonBgmKey('ashen-forge-east')).toBe('dungeon:ashen_furnace')
    expect(getMonsterBgmKey('lava_heart')).toBe('monster:lava_heart')
    expect(getMonsterBgmKey('ember_slime')).toBeNull()
  })

  it('loads the regional track at entry and monster tracks in the background', () => {
    const entryKeys = getDungeonEntryBgmKeys('ashen-forge-west')
    const monsterKeys = Object.keys(BGM_ASSETS).filter((key) => key.startsWith('monster:'))
    expect(entryKeys).toEqual(['dungeon:flooded_foundry'])
    expect(getDungeonBackgroundBgmKeys()).toEqual(monsterKeys)
  })
})
