import { describe, expect, it } from 'vitest'
import {
  canTravelToNode,
  completeAndUnlockNext,
  DIFFICULTY_ONE_CONFIG,
  enterFloorAtStart,
  findMapNode,
  generateMap,
  getConnectedNodeIds,
  getMapNodes,
  validateFloorMap,
} from '../mapGenerationSystem.js'

describe('Darkest Dungeon-style map generation', () => {
  it('fixes the current dungeon at difficulty one with two floors', () => {
    const map = generateMap({ seed: 42, difficulty: 9 })

    expect(map.difficulty).toBe(1)
    expect(map.floors).toHaveLength(2)
    expect(DIFFICULTY_ONE_CONFIG.floorCount).toBe(2)
  })

  it('creates 5 to 7 rooms and exactly one dead-end branch on every floor', () => {
    for (let seed = 0; seed < 100; seed += 1) {
      generateMap({ seed }).floors.forEach((floor) => {
        expect(floor.nodes.length).toBeGreaterThanOrEqual(5)
        expect(floor.nodes.length).toBeLessThanOrEqual(7)
        expect(floor.branches).toHaveLength(1)
        const branchEndId = floor.branches[0].nodeIds.at(-1)
        expect(getConnectedNodeIds({ floors: [floor] }, floor.number, branchEndId)).toHaveLength(1)
      })
    }
  })

  it('uses rooms and bidirectional corridors instead of step and lane data', () => {
    const floor = generateMap({ seed: 42 }).floors[0]

    expect(floor.steps).toBeUndefined()
    expect(floor.nodes.every((node) =>
      Number.isInteger(node.position.x) && Number.isInteger(node.position.y)
      && node.step === undefined && node.lane === undefined)).toBe(true)
    expect(floor.corridors.every(({ bidirectional }) => bidirectional)).toBe(true)
  })

  it('creates floor starts, first-floor stairs, and a final-floor boss', () => {
    const map = generateMap({ seed: 42 })
    const firstFloor = map.floors[0]
    const finalFloor = map.floors[1]

    expect(findMapNode(map, firstFloor.startNodeId).type).toBe('floor_start')
    expect(findMapNode(map, firstFloor.destinationNodeId).type).toBe('stairs')
    expect(findMapNode(map, finalFloor.startNodeId).type).toBe('floor_start')
    expect(findMapNode(map, finalFloor.destinationNodeId)).toMatchObject({
      type: 'boss',
      grade: 'boss',
      isFinalBoss: true,
    })
  })

  it('generates an identical saved graph from the same seed', () => {
    expect(generateMap({ seed: 2026 })).toEqual(generateMap({ seed: 2026 }))
  })

  it('generates a connected acyclic room graph with a valid dead end', () => {
    for (let seed = 0; seed < 250; seed += 1) {
      generateMap({ seed }).floors.forEach((floor) => {
        expect(validateFloorMap(floor)).toEqual({ valid: true, errors: [] })
        expect(floor.corridors).toHaveLength(floor.nodes.length - 1)
      })
    }
  })

  it('unlocks every room directly connected to a completed room without deleting branches', () => {
    const map = generateMap({ seed: 42 })
    const startId = map.floors[0].startNodeId
    const connected = getConnectedNodeIds(map, 1, startId)
    const next = completeAndUnlockNext(map, startId)

    expect(findMapNode(next, startId).status).toBe('complete')
    expect(connected.every((id) => findMapNode(next, id).status === 'available')).toBe(true)
    expect(getMapNodes(next, 1)).toHaveLength(getMapNodes(map, 1).length)
  })

  it('allows adjacent exploration and automatic travel only through completed rooms', () => {
    let map = generateMap({ seed: 7 })
    const startId = map.floors[0].startNodeId
    map = completeAndUnlockNext(map, startId)
    const nextId = getConnectedNodeIds(map, 1, startId)[0]

    expect(canTravelToNode(map, startId, nextId)).toBe(true)
    map = completeAndUnlockNext(map, nextId)
    expect(canTravelToNode(map, nextId, startId)).toBe(true)

    const unavailable = getMapNodes(map, 1).find(({ status }) => status === 'locked')
    expect(canTravelToNode(map, startId, unavailable.id)).toBe(false)
    expect(canTravelToNode(map, startId, unavailable.id, true)).toBe(true)
  })

  it('unlocks the next floor start only after completing the stairs', () => {
    const map = generateMap({ seed: 42 })
    const stairsId = map.floors[0].destinationNodeId
    const nextStartId = map.floors[1].startNodeId
    const next = completeAndUnlockNext(map, stairsId)

    expect(findMapNode(next, stairsId).status).toBe('complete')
    expect(findMapNode(next, nextStartId).status).toBe('available')
  })

  it('moves directly to a floor start and completes it on entry', () => {
    const map = generateMap({ seed: 42 })
    const entered = enterFloorAtStart(map, 1)
    const connected = getConnectedNodeIds(entered.map, 1, entered.currentNodeId)

    expect(findMapNode(entered.map, entered.currentNodeId)).toMatchObject({
      type: 'floor_start',
      status: 'complete',
    })
    expect(connected.every((nodeId) =>
      findMapNode(entered.map, nodeId).status === 'available')).toBe(true)
  })
})
