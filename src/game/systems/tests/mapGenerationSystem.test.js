import { describe, expect, it } from 'vitest'
import {
  completeAndUnlockNext,
  canDeveloperEnterNode,
  DIFFICULTY_ONE_TEMPLATES,
  findMapNode,
  generateMap,
  getMapEdges,
  getMapNodes,
  isNodeWithinKnownProgress,
} from '../mapGenerationSystem.js'

describe('map generation', () => {
  it('creates the Ashen Forge at difficulty 1 with two floors and five node steps per floor', () => {
    const map = generateMap({ seed: 42 })

    expect(map.dungeonId).toBe('ashen-forge')
    expect(map.dungeonName).toBe('잿빛 용광로')
    expect(map.difficulty).toBe(1)
    expect(map.floors).toHaveLength(2)
    expect(map.floors.every(({ steps }) => steps.length === 5)).toBe(true)
  })

  it('creates one start and one boss node on every floor', () => {
    const map = generateMap({ seed: 42 })

    map.floors.forEach(({ number, steps }) => {
      expect(steps[0]).toHaveLength(1)
      expect(steps[0][0]).toMatchObject({ floor: number, step: 1, type: 'start' })
      expect(steps[4]).toHaveLength(1)
      expect(steps[4][0]).toMatchObject({ floor: number, step: 5, type: 'boss' })
    })
    expect(map.floors[1].steps[4][0].isFinalBoss).toBe(true)
  })

  it('generates the same encounter layout from the same seed', () => {
    expect(generateMap({ seed: 2026 })).toEqual(generateMap({ seed: 2026 }))
  })

  it('selects all difficulty-one templates across different seeds', () => {
    const generatedTemplateIds = new Set()
    for (let seed = 0; seed < 100; seed += 1) {
      generateMap({ seed }).floors.forEach(({ templateId }) => generatedTemplateIds.add(templateId))
    }

    expect(generatedTemplateIds).toEqual(new Set(
      DIFFICULTY_ONE_TEMPLATES.map(({ id }) => id),
    ))
  })

  it('limits difficulty one to A-B lanes and at most two outgoing connections', () => {
    for (let seed = 0; seed < 30; seed += 1) {
      const map = generateMap({ seed })
      map.floors.forEach(({ steps }) => {
        expect(steps.every((nodes) => nodes.length <= 2)).toBe(true)
        expect(steps.flat().every((node) =>
          /^[12]-[1-5]-[AB]$/.test(node.id) && node.nextNodeIds.length <= 2,
        )).toBe(true)
      })
    }
  })

  it('allows a branch to merge after one node step', () => {
    const map = generateMap({ seed: 0 })
    const hasSingleStepBranch = map.floors.some(({ steps }) =>
      steps.some((nodes, index) =>
        nodes.length === 2 && steps[index + 1]?.length === 1))

    expect(hasSingleStepBranch).toBe(true)
  })

  it('only creates rest nodes from the second half of a floor', () => {
    for (let seed = 0; seed < 100; seed += 1) {
      getMapNodes(generateMap({ seed }), 1)
        .filter(({ type }) => type === 'rest')
        .forEach(({ step }) => expect(step).toBeGreaterThanOrEqual(3))
    }
  })

  it('assigns normal, named, and boss encounter grades', () => {
    const grades = new Set()
    for (let seed = 0; seed < 100; seed += 1) {
      getMapNodes(generateMap({ seed }), 1).forEach(({ grade }) => {
        if (grade) grades.add(grade)
      })
    }

    expect(grades).toEqual(new Set(['normal', 'named', 'boss']))
  })

  it('only connects nodes to the immediately following node step on the same floor', () => {
    const map = generateMap({ seed: 42 })

    map.floors.forEach(({ number }) => {
      const nodes = new Map(getMapNodes(map, number).map((node) => [node.id, node]))
      expect(getMapEdges(map, number).every(({ from, to }) => {
        const source = nodes.get(from)
        const target = nodes.get(to)
        return target.floor === source.floor && target.step === source.step + 1
      })).toBe(true)
    })
  })

  it('ensures every node can reach its floor boss', () => {
    const map = generateMap({ seed: 42 })

    map.floors.forEach(({ number, steps }) => {
      const bossId = steps[4][0].id
      getMapNodes(map, number).forEach((node) => {
        let candidates = [node]
        const visited = new Set()
        let reachedBoss = false
        while (candidates.length) {
          const current = candidates.shift()
          if (current.id === bossId) {
            reachedBoss = true
            break
          }
          visited.add(current.id)
          candidates.push(...current.nextNodeIds
            .filter((id) => !visited.has(id))
            .map((id) => findMapNode(map, id)))
        }
        expect(reachedBoss).toBe(true)
      })
    })
  })

  it('completes a chosen node, locks alternatives, and unlocks only connected next nodes', () => {
    const map = generateMap({ seed: 42 })
    const floor = map.floors[0]
    const branchedStepIndex = floor.steps.findIndex((nodes) => nodes.length === 2)
    const chosen = floor.steps[branchedStepIndex][0]
    const alternative = floor.steps[branchedStepIndex][1]
    const next = completeAndUnlockNext(map, chosen.id)

    expect(findMapNode(next, chosen.id).status).toBe('complete')
    expect(findMapNode(next, alternative.id).status).toBe('locked')
    expect(findMapNode(next, chosen.nextNodeIds[0]).status).toBe('available')
    expect(next.floors[0].steps[branchedStepIndex + 1]
      .filter(({ id }) => !chosen.nextNodeIds.includes(id))
      .every(({ status }) => status === 'locked')).toBe(true)
  })

  it('unlocks the second-floor entrance after the first-floor boss', () => {
    const map = generateMap({ seed: 42 })
    const next = completeAndUnlockNext(map, '1-5-A')

    expect(findMapNode(next, '1-5-A').status).toBe('complete')
    expect(findMapNode(next, '2-1-A').status).toBe('available')
  })

  it('allows developer movement at the current or later step but rejects earlier steps', () => {
    const current = { floor: 1, step: 3 }

    expect(canDeveloperEnterNode(current, { floor: 1, step: 1 })).toBe(false)
    expect(canDeveloperEnterNode(current, { floor: 1, step: 2 })).toBe(false)
    expect(canDeveloperEnterNode(current, { floor: 1, step: 3 })).toBe(true)
    expect(canDeveloperEnterNode(current, { floor: 1, step: 5 })).toBe(true)
    expect(canDeveloperEnterNode(current, { floor: 2, step: 1 })).toBe(true)
  })

  it('reveals only nodes at or behind the current floor and step', () => {
    const progress = { floor: 1, step: 3 }

    expect(isNodeWithinKnownProgress({ floor: 1, step: 2 }, progress)).toBe(true)
    expect(isNodeWithinKnownProgress({ floor: 1, step: 3 }, progress)).toBe(true)
    expect(isNodeWithinKnownProgress({ floor: 1, step: 4 }, progress)).toBe(false)
    expect(isNodeWithinKnownProgress({ floor: 2, step: 1 }, progress)).toBe(false)
  })
})
