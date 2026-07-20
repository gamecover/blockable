import { describe, expect, it } from 'vitest'
import { completeAndUnlockNext, generateMap, getMapEdges } from '../mapGenerationSystem.js'

describe('map generation', () => {
  it('creates ten floors with one start and one boss', () => {
    const map = generateMap(() => 0.5)
    expect(map).toHaveLength(10)
    expect(map[0]).toHaveLength(1)
    expect(map[9][0].type).toBe('boss')
  })
  it('completes a node and unlocks the next floor', () => {
    const map = generateMap(() => 0.5)
    const next = completeAndUnlockNext(map, '1-0')
    expect(next[0][0].status).toBe('complete')
    expect(next[1].every(({ status }) => status === 'available')).toBe(true)
  })

  it('only creates connections toward the immediately following floor', () => {
    const map = generateMap(() => 0.5)
    const nodes = new Map(map.flat().map((node) => [node.id, node]))
    expect(getMapEdges(map).every(({ from, to }) => nodes.get(to).floor === nodes.get(from).floor + 1)).toBe(true)
  })

  it('locks unselected nodes on the completed phase', () => {
    const map = generateMap(() => 0.5)
    const afterStart = completeAndUnlockNext(map, '1-0')
    const selected = afterStart[1][0]
    const next = completeAndUnlockNext(afterStart, selected.id)
    expect(next[1].filter(({ id }) => id !== selected.id).every(({ status }) => status === 'locked')).toBe(true)
  })
})
