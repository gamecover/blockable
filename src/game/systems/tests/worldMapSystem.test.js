import { describe, expect, it } from 'vitest'
import {
  canEnterWorldDungeon,
  completeWorldDungeon,
  createWorldMapState,
} from '../worldMapSystem.js'

describe('world map', () => {
  it('unlocks the final dungeon after both normal dungeons are complete', () => {
    const initial = createWorldMapState()
    const afterFirst = completeWorldDungeon(initial, 'ashen-forge-west')
    const afterSecond = completeWorldDungeon(afterFirst, 'ashen-forge-east')
    expect(afterFirst.dungeons.find(({ kind }) => kind === 'final').status).toBe('locked')
    expect(afterSecond.dungeons.find(({ kind }) => kind === 'final').status).toBe('available')
  })

  it('lets developer mode enter every dungeon', () => {
    const finalDungeon = createWorldMapState().dungeons.find(({ kind }) => kind === 'final')
    expect(canEnterWorldDungeon(finalDungeon, false)).toBe(false)
    expect(canEnterWorldDungeon(finalDungeon, true)).toBe(true)
  })
})
