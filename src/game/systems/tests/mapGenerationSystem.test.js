import { describe, expect, it } from 'vitest'
import { completeAndUnlockNext, generateMap } from '../mapGenerationSystem.js'

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
})
