import { describe, expect, it } from 'vitest'
import {
  canEnterWorldDungeon,
  completeWorldDungeon,
  createWorldMapState,
} from '../worldMapSystem.js'

describe('world map', () => {
  it('keeps the final dungeon available regardless of normal dungeon completion', () => {
    const initial = createWorldMapState()
    const afterFirst = completeWorldDungeon(initial, 'ashen-forge-west')
    const afterSecond = completeWorldDungeon(afterFirst, 'ashen-forge-east')
    expect(initial.dungeons.find(({ kind }) => kind === 'final').status).toBe('available')
    expect(afterFirst.dungeons.find(({ kind }) => kind === 'final').status).toBe('available')
    expect(afterSecond.dungeons.find(({ kind }) => kind === 'final').status).toBe('available')
  })

  it('lets normal mode enter the final dungeon from the beginning', () => {
    const finalDungeon = createWorldMapState().dungeons.find(({ kind }) => kind === 'final')
    expect(canEnterWorldDungeon(finalDungeon, false)).toBe(true)
    expect(canEnterWorldDungeon(finalDungeon, true)).toBe(true)
  })
})
