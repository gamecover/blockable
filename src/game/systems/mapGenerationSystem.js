import { DEFAULT_DUNGEON } from '../constants/gameConfig.js'

const laneLabels = ['A', 'B', 'C']
export const DIFFICULTY_ONE_TEMPLATES = [
  { id: 'early-branch', nodeCounts: [1, 2, 2, 1, 1] },
  { id: 'late-branch', nodeCounts: [1, 1, 2, 2, 1] },
  { id: 'sustained-branch', nodeCounts: [1, 2, 2, 2, 1] },
]

const createSeededRandom = (seed) => {
  let value = (Math.imul(seed >>> 0, 2654435761) + 1013904223) >>> 0
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0
    return value / 4294967296
  }
}

const createNode = ({ floor, step, lane, type, available = false, finalBoss = false }) => ({
  id: `${floor}-${step}-${laneLabels[lane]}`,
  floor,
  step,
  lane,
  type,
  status: available ? 'available' : 'locked',
  isFinalBoss: finalBoss,
  nextNodeIds: [],
})

const assignEncounterTypes = (step, count, random) => {
  if (step === 1) return ['start']
  if (step === DEFAULT_DUNGEON.nodeStepCount) return ['boss']
  return Array.from({ length: count }, () => random() < 0.66 ? 'battle' : 'event')
}

const connectFloor = (steps) => steps.map((nodes, stepIndex) => nodes.map((node) => {
  const nextNodes = steps[stepIndex + 1] ?? []
  if (!nextNodes.length) return node
  if (nodes.length === 1 || nextNodes.length === 1) {
    return { ...node, nextNodeIds: nextNodes.map(({ id }) => id) }
  }
  return { ...node, nextNodeIds: [nextNodes[Math.min(node.lane, nextNodes.length - 1)].id] }
}))

const createFloor = (floor, floorCount, random) => {
  const template = DIFFICULTY_ONE_TEMPLATES[
    Math.floor(random() * DIFFICULTY_ONE_TEMPLATES.length)
  ]
  const steps = template.nodeCounts.map((count, index) => {
    const step = index + 1
    const types = assignEncounterTypes(step, count, random)
    return types.map((type, lane) => createNode({
      floor,
      step,
      lane,
      type,
      available: floor === 1 && step === 1,
      finalBoss: type === 'boss' && floor === floorCount,
    }))
  })
  return { number: floor, templateId: template.id, steps: connectFloor(steps) }
}

export const generateMap = ({ seed = Math.floor(Math.random() * 4294967296) } = {}) => {
  const random = createSeededRandom(seed)
  return {
    dungeonId: DEFAULT_DUNGEON.id,
    dungeonName: DEFAULT_DUNGEON.name,
    difficulty: DEFAULT_DUNGEON.difficulty,
    seed,
    floors: Array.from(
      { length: DEFAULT_DUNGEON.floorCount },
      (_, index) => createFloor(index + 1, DEFAULT_DUNGEON.floorCount, random),
    ),
  }
}

export const getFloor = (map, floor) => map.floors.find(({ number }) => number === floor)

export const getMapNodes = (map, floor) => {
  const selectedFloor = getFloor(map, floor)
  return selectedFloor ? selectedFloor.steps.flat() : []
}

export const findMapNode = (map, nodeId) =>
  map.floors.flatMap(({ steps }) => steps.flat()).find(({ id }) => id === nodeId)

export const canDeveloperEnterNode = ({ floor, step }, node) =>
  node.floor > floor || (node.floor === floor && node.step >= step)

export const getMapNodePosition = (map, node) => {
  const selectedFloor = getFloor(map, node.floor)
  const nodes = selectedFloor?.steps[node.step - 1] ?? [node]
  const stepCount = selectedFloor?.steps.length ?? DEFAULT_DUNGEON.nodeStepCount
  return {
    x: 8 + ((node.step - 1) / (stepCount - 1)) * 84,
    y: nodes.length === 1 ? 50 : 28 + (node.lane / (nodes.length - 1)) * 44,
  }
}

export const getMapEdges = (map, floor) => getMapNodes(map, floor).flatMap((node) =>
  node.nextNodeIds.map((targetId) => ({ from: node.id, to: targetId })))

export const completeAndUnlockNext = (map, nodeId) => {
  const current = findMapNode(map, nodeId)
  if (!current) return map

  const nextNodeIds = new Set(current.nextNodeIds)
  const unlockNextFloor = current.type === 'boss' && !current.isFinalBoss

  return {
    ...map,
    floors: map.floors.map((floor) => ({
      ...floor,
      steps: floor.steps.map((nodes) => nodes.map((node) => {
        if (node.id === nodeId) return { ...node, status: 'complete' }
        if (node.floor === current.floor && node.step === current.step) {
          return { ...node, status: 'locked' }
        }
        if (nextNodeIds.has(node.id)) return { ...node, status: 'available' }
        if (unlockNextFloor && node.floor === current.floor + 1 && node.step === 1) {
          return { ...node, status: 'available' }
        }
        return node
      })),
    })),
  }
}
