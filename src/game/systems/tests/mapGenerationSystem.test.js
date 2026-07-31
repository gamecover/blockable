import { describe, expect, it } from 'vitest'
import {
  canTravelToNode,
  completeAndUnlockNext,
  DIFFICULTY_CONFIGS,
  DIFFICULTY_ONE_CONFIG,
  enterFloorAtStart,
  findMapNode,
  generateMap,
  getConnectedNodeIds,
  getMapNodeDistances,
  getMapNodePosition,
  getShortestPathNodeIds,
  getMapNodes,
  revealMapAroundNode,
  validateFloorMap,
} from '../mapGenerationSystem.js'

describe('Darkest Dungeon-style map generation', () => {
  it('uses the documented floor and room ranges for every developer difficulty', () => {
    for (let difficulty = 1; difficulty <= 10; difficulty += 1) {
      const config = DIFFICULTY_CONFIGS[difficulty]
      const map = generateMap({ seed: 42, difficulty })
      expect(map.difficulty).toBe(difficulty)
      expect(map.floors).toHaveLength(config.floorCount)
      map.floors.forEach((floor) => {
        expect(floor.nodes.length).toBeGreaterThanOrEqual(config.nodesPerFloor.min)
        expect(floor.nodes.length).toBeLessThanOrEqual(config.nodesPerFloor.max)
        expect(floor.mainPathLength).toBeGreaterThanOrEqual(config.mainPathLength.min)
        expect(floor.mainPathLength).toBeLessThanOrEqual(config.mainPathLength.max)
        expect(floor.branches.length).toBeGreaterThanOrEqual(config.branchCount.min)
        expect(floor.branches.length).toBeLessThanOrEqual(config.branchCount.max)
      })
    }
    expect(DIFFICULTY_ONE_CONFIG.floorCount).toBe(2)
  })

  it('creates 7 to 9 rooms and two to three base branches on every floor', () => {
    for (let seed = 0; seed < 100; seed += 1) {
      generateMap({ seed }).floors.forEach((floor) => {
        expect(floor.nodes.length).toBeGreaterThanOrEqual(7)
        expect(floor.nodes.length).toBeLessThanOrEqual(9)
        expect(floor.nodes).toHaveLength(floor.targetNodeCount)
        expect(floor.branches.length).toBeGreaterThanOrEqual(2)
        expect(floor.branches.length).toBeLessThanOrEqual(3)
        floor.branches.forEach((branch) => {
          expect(branch.nodeIds.length).toBeGreaterThanOrEqual(1)
          expect(branch.nodeIds.length).toBeLessThanOrEqual(2)
        })
      })
    }
  })

  it('bends every main path vertically instead of generating a fully horizontal route', () => {
    for (let seed = 0; seed < 250; seed += 1) {
      generateMap({ seed }).floors.forEach((floor) => {
        const mainNodes = floor.nodes.filter(({ pathRole }) => pathRole === 'main')
        expect(new Set(mainNodes.map(({ position }) => position.y)).size).toBeGreaterThan(1)
        expect(floor.mainPathLength).toBeGreaterThanOrEqual(3)
        expect(floor.mainPathLength).toBeLessThanOrEqual(5)
      })
    }
  })

  it('starts at the center, spaces rooms on unique grid cells, and sends destinations in varied directions', () => {
    const destinationDirections = new Set()
    for (let seed = 0; seed < 250; seed += 1) {
      generateMap({ seed }).floors.forEach((floor) => {
        const start = floor.nodes.find(({ id }) => id === floor.startNodeId)
        const coordinateKeys = floor.nodes.map(({ position }) => `${position.x},${position.y}`)
        const renderedPositions = floor.nodes.map((node) => getMapNodePosition({
          floors: [floor],
        }, node))

        expect(start.position).toEqual({ x: 0, y: 0 })
        expect(getMapNodePosition({ floors: [floor] }, start)).toEqual({ x: 50, y: 50 })
        expect(new Set(coordinateKeys)).toHaveLength(floor.nodes.length)
        expect(renderedPositions.every(({ x, y }) =>
          x >= 10 && x <= 90 && y >= 14 && y <= 86)).toBe(true)
        expect(Math.abs(
          floor.nodes.find(({ id }) => id === floor.destinationNodeId).position.x,
        ) + Math.abs(
          floor.nodes.find(({ id }) => id === floor.destinationNodeId).position.y,
        )).toBeGreaterThanOrEqual(2)
        destinationDirections.add(floor.destinationDirection)
      })
    }
    expect(destinationDirections).toEqual(new Set([
      'east',
      'north',
      'north-east',
      'north-west',
      'south',
      'south-east',
      'south-west',
      'west',
    ]))
  })

  it('turns every two-room branch instead of stacking its rooms in one line', () => {
    for (let seed = 0; seed < 250; seed += 1) {
      const map = generateMap({ seed })
      map.floors.forEach((floor) => {
        floor.branches
          .filter(({ nodeIds }) => nodeIds.length > 1)
          .forEach((branch) => {
            const anchor = findMapNode(map, branch.anchorNodeId).position
            const first = findMapNode(map, branch.nodeIds[0]).position
            const second = findMapNode(map, branch.nodeIds[1]).position
            const firstStep = { x: first.x - anchor.x, y: first.y - anchor.y }
            const secondStep = { x: second.x - first.x, y: second.y - first.y }
            expect(firstStep).not.toEqual(secondStep)
          })
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

  it('places a guaranteed rest room at the destination-side midpoint of every shortest main path', () => {
    for (let seed = 0; seed < 100; seed += 1) {
      const map = generateMap({ seed })
      map.floors.forEach((floor) => {
        const shortestPath = getShortestPathNodeIds(
          map,
          floor.number,
          floor.startNodeId,
          floor.destinationNodeId,
        )
        const midpoint = shortestPath[Math.ceil((shortestPath.length - 1) / 2)]
        expect(findMapNode(map, midpoint).type).toBe('rest')
      })
    }
  })

  it('limits optional rest rooms to one and keeps their appearance rate low', () => {
    let floorCount = 0
    let floorsWithOptionalRest = 0
    for (let seed = 0; seed < 500; seed += 1) {
      generateMap({ seed }).floors.forEach((floor) => {
        const restCount = floor.nodes.filter(({ type }) => type === 'rest').length
        expect(restCount).toBeGreaterThanOrEqual(1)
        expect(restCount).toBeLessThanOrEqual(2)
        floorCount += 1
        if (restCount === 2) floorsWithOptionalRest += 1
      })
    }
    expect(floorsWithOptionalRest / floorCount).toBeLessThan(0.2)
  })

  it('generates an identical saved graph from the same seed', () => {
    expect(generateMap({ seed: 2026 })).toEqual(generateMap({ seed: 2026 }))
  })

  it('generates a connected graph while allowing probabilistic nearby cycles', () => {
    for (let seed = 0; seed < 250; seed += 1) {
      generateMap({ seed }).floors.forEach((floor) => {
        expect(validateFloorMap(floor)).toEqual({ valid: true, errors: [] })
        expect(floor.corridors.length).toBeGreaterThanOrEqual(floor.nodes.length - 1)
      })
    }
  })

  it('probabilistically links nearby rooms without a per-room branch limit', () => {
    let floorsWithLinks = 0
    let floorsWithoutLinks = 0
    let maximumDegree = 0

    for (let seed = 0; seed < 500; seed += 1) {
      generateMap({ seed }).floors.forEach((floor) => {
        const links = floor.corridors.filter(({ pathRole }) => pathRole === 'link')
        if (links.length) floorsWithLinks += 1
        else floorsWithoutLinks += 1

        links.forEach(({ from, to }) => {
          const fromNode = floor.nodes.find(({ id }) => id === from)
          const toNode = floor.nodes.find(({ id }) => id === to)
          expect(Math.max(
            Math.abs(fromNode.position.x - toNode.position.x),
            Math.abs(fromNode.position.y - toNode.position.y),
          )).toBe(1)
          expect([from, to]).not.toContain(floor.startNodeId)
          expect([from, to]).not.toContain(floor.destinationNodeId)
        })

        floor.nodes.forEach(({ id }) => {
          maximumDegree = Math.max(
            maximumDegree,
            floor.corridors.filter(({ from, to }) => from === id || to === id).length,
          )
        })
      })
    }

    expect(floorsWithLinks).toBeGreaterThan(0)
    expect(floorsWithoutLinks).toBeGreaterThan(0)
    expect(maximumDegree).toBeGreaterThan(3)
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

  it('calculates one-step information and two-step mystery visibility from the current room', () => {
    const map = generateMap({ seed: 42 })
    const floor = 1
    const startId = map.floors[0].startNodeId
    const distances = getMapNodeDistances(map, floor, startId)
    const firstStep = getConnectedNodeIds(map, floor, startId)

    expect(distances.get(startId)).toBe(0)
    expect(firstStep.every((nodeId) => distances.get(nodeId) === 1)).toBe(true)
    expect([...distances.values()].some((distance) => distance === 2)).toBe(true)
  })

  it('keeps previously revealed rooms when the player moves elsewhere', () => {
    const generated = generateMap({ seed: 42 })
    const entered = enterFloorAtStart(generated, 1)
    const startId = entered.currentNodeId
    const nextId = getConnectedNodeIds(entered.map, 1, startId)[0]
    const firstReveal = revealMapAroundNode(entered.map, nextId)
    const revealedBeforeReturning = getMapNodes(firstReveal, 1)
      .filter(({ revealState }) => revealState !== 'hidden')
      .map(({ id }) => id)
    const returned = revealMapAroundNode(firstReveal, startId)
    const revealedAfterReturning = new Set(
      getMapNodes(returned, 1)
        .filter(({ revealState }) => revealState !== 'hidden')
        .map(({ id }) => id),
    )

    expect(revealedBeforeReturning.every((id) => revealedAfterReturning.has(id))).toBe(true)
    expect(findMapNode(returned, nextId).revealState).toBe('revealed')
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
