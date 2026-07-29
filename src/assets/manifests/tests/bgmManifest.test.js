import { describe, expect, it } from 'vitest'
import { getScreenBgmKey } from '../bgmManifest.js'

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
    })).toBe('dungeon:ashen_furnace')
  })

  it('uses the dungeon track inside a dungeon and stops it outside', () => {
    expect(getScreenBgmKey({
      screen: 'map',
      activeDungeonId: 'great-forge',
    })).toBe('dungeon:ashen_furnace')
    expect(getScreenBgmKey({
      screen: 'worldMap',
      activeDungeonId: null,
    })).toBeNull()
  })
})
