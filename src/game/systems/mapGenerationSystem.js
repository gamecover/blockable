import { DEFAULT_DUNGEON } from '../constants/gameConfig.js'

export const MAP_SCHEMA_VERSION = 2
export const MAP_GENERATOR_VERSION = '0.6.0'

export const DIFFICULTY_ONE_CONFIG = Object.freeze({
  difficulty: 1,
  floorCount: 2,
  nodesPerFloor: { min: 5, max: 7 },
  mainPathLength: { min: 3, max: 4 },
  branchCount: 1,
  branchLength: { min: 1, max: 2 },
  maxBranchDepth: 2,
  riskBranchCount: { min: 0, max: 1 },
})

const createSeededRandom = (seed) => {
  let value = (Math.imul(seed >>> 0, 2654435761) + 1013904223) >>> 0
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0
    return value / 4294967296
  }
}

const randomInteger = (random, min, max) => min + Math.floor(random() * (max - min + 1))

const pick = (values, random) => values[Math.floor(random() * values.length)]

const createNode = ({
  id,
  floor,
  type,
  pathRole,
  position,
  available = false,
  grade = null,
  branchId = null,
  branchDepth = 0,
  finalBoss = false,
}) => ({
  id,
  floor,
  type,
  grade,
  pathRole,
  branchId,
  branchDepth,
  position,
  status: available ? 'available' : 'locked',
  revealState: available ? 'revealed' : 'hidden',
  rewardClaimed: false,
  isFinalBoss: finalBoss,
})

const createCorridor = (floor, index, from, to, pathRole, branchId = null) => ({
  id: `f${floor}_e${index}`,
  from,
  to,
  bidirectional: true,
  pathRole,
  branchId,
})

const pickRoomType = (random, { branchEnd = false } = {}) => {
  if (branchEnd) return pick(['event', 'rest'], random)
  const roll = random()
  if (roll < 0.52) return 'battle'
  if (roll < 0.76) return 'event'
  if (roll < 0.9) return 'rest'
  return 'battle'
}

const createFloor = (floor, floorCount, random) => {
  const config = DIFFICULTY_ONE_CONFIG
  const targetNodeCount = randomInteger(random, config.nodesPerFloor.min, config.nodesPerFloor.max)
  const desiredMainEdges = randomInteger(random, config.mainPathLength.min, config.mainPathLength.max)
  const mainNodeCount = Math.min(desiredMainEdges + 1, targetNodeCount - config.branchLength.min)
  const branchLength = Math.min(
    randomInteger(random, config.branchLength.min, config.branchLength.max),
    targetNodeCount - mainNodeCount,
  )
  const actualNodeCount = mainNodeCount + Math.max(1, branchLength)
  const isFinalFloor = floor === floorCount
  const branchAnchorIndex = randomInteger(random, 1, Math.max(1, mainNodeCount - 2))
  const branchDirection = random() < 0.5 ? -1 : 1
  const isRiskBranch = random() < 0.5
  const branchId = `f${floor}_b1`
  const restNodeIndex = Math.ceil((mainNodeCount - 1) / 2)
  const nodes = []
  const corridors = []

  for (let index = 0; index < mainNodeCount; index += 1) {
    const isStart = index === 0
    const isDestination = index === mainNodeCount - 1
    let type = pickRoomType(random)
    if (isStart) type = 'floor_start'
    if (isDestination) type = isFinalFloor ? 'boss' : 'stairs'
    if (index === restNodeIndex) type = 'rest'
    if (isFinalFloor && index === mainNodeCount - 2 && !['battle', 'rest'].includes(type)) {
      type = random() < 0.5 ? 'battle' : 'rest'
    }
    const id = `f${floor}_n${index + 1}`
    nodes.push(createNode({
      id,
      floor,
      type,
      grade: type === 'battle' ? (random() < 0.2 ? 'named' : 'normal') : type === 'boss' ? 'boss' : null,
      pathRole: 'main',
      position: { x: index, y: 0 },
      available: floor === 1 && isStart,
      finalBoss: type === 'boss',
    }))
    if (index > 0) {
      corridors.push(createCorridor(floor, corridors.length + 1, `f${floor}_n${index}`, id, 'main'))
    }
  }

  let previousId = `f${floor}_n${branchAnchorIndex + 1}`
  for (let depth = 1; depth <= Math.max(1, branchLength); depth += 1) {
    const id = `f${floor}_n${nodes.length + 1}`
    const isEnd = depth === Math.max(1, branchLength)
    const type = isRiskBranch && isEnd ? 'elite' : pickRoomType(random, { branchEnd: isEnd })
    nodes.push(createNode({
      id,
      floor,
      type,
      grade: type === 'elite' ? 'named' : type === 'battle' ? 'normal' : null,
      pathRole: isRiskBranch ? 'risk' : 'branch',
      branchId,
      branchDepth: depth,
      position: { x: branchAnchorIndex, y: branchDirection * depth },
    }))
    corridors.push(createCorridor(
      floor,
      corridors.length + 1,
      previousId,
      id,
      isRiskBranch ? 'risk' : 'branch',
      branchId,
    ))
    previousId = id
  }

  return {
    id: `f${floor}`,
    number: floor,
    targetNodeCount,
    actualNodeCount,
    mainPathLength: mainNodeCount - 1,
    startNodeId: `f${floor}_n1`,
    destinationNodeId: `f${floor}_n${mainNodeCount}`,
    nodes,
    corridors,
    branches: [{
      id: branchId,
      type: isRiskBranch ? 'risk' : 'normal',
      anchorNodeId: `f${floor}_n${branchAnchorIndex + 1}`,
      nodeIds: nodes.filter((node) => node.branchId === branchId).map(({ id }) => id),
      depth: Math.max(1, branchLength),
      completed: false,
    }],
  }
}

export const generateMap = ({
  seed = Math.floor(Math.random() * 4294967296),
  dungeonId = DEFAULT_DUNGEON.id,
  dungeonName = DEFAULT_DUNGEON.name,
  difficulty = 1,
} = {}) => {
  const random = createSeededRandom(seed)
  const normalizedDifficulty = difficulty === 1 ? difficulty : 1
  return {
    schemaVersion: MAP_SCHEMA_VERSION,
    generatorVersion: MAP_GENERATOR_VERSION,
    dungeonId,
    dungeonName,
    difficulty: normalizedDifficulty,
    seed,
    floors: Array.from(
      { length: DIFFICULTY_ONE_CONFIG.floorCount },
      (_, index) => createFloor(index + 1, DIFFICULTY_ONE_CONFIG.floorCount, random),
    ),
  }
}

export const getFloor = (map, floor) => map.floors.find(({ number }) => number === floor)

export const getMapNodes = (map, floor) => getFloor(map, floor)?.nodes ?? []

export const getMapEdges = (map, floor) => getFloor(map, floor)?.corridors ?? []

export const findMapNode = (map, nodeId) =>
  map.floors.flatMap(({ nodes }) => nodes).find(({ id }) => id === nodeId)

export const getConnectedNodeIds = (map, floor, nodeId) =>
  getMapEdges(map, floor).flatMap(({ from, to }) => {
    if (from === nodeId) return [to]
    if (to === nodeId) return [from]
    return []
  })

export const getShortestPathNodeIds = (map, floor, startNodeId, destinationNodeId) => {
  const visited = new Set([startNodeId])
  const queue = [[startNodeId]]
  while (queue.length) {
    const path = queue.shift()
    const currentId = path.at(-1)
    if (currentId === destinationNodeId) return path
    getConnectedNodeIds(map, floor, currentId).forEach((neighborId) => {
      if (visited.has(neighborId)) return
      visited.add(neighborId)
      queue.push([...path, neighborId])
    })
  }
  return []
}

export const getMapNodePosition = (map, node) => {
  const nodes = getMapNodes(map, node.floor)
  const xs = nodes.map(({ position }) => position.x)
  const ys = nodes.map(({ position }) => position.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const xRange = Math.max(1, maxX - minX)
  const yRange = Math.max(2, maxY - minY)
  return {
    x: 10 + ((node.position.x - minX) / xRange) * 80,
    y: 50 + ((node.position.y - (minY + maxY) / 2) / yRange) * 62,
  }
}

const hasClearedPath = (map, currentNodeId, targetNodeId) => {
  const current = findMapNode(map, currentNodeId)
  if (!current) return false
  const visited = new Set([currentNodeId])
  const queue = [currentNodeId]
  while (queue.length) {
    const nodeId = queue.shift()
    if (nodeId === targetNodeId) return true
    getConnectedNodeIds(map, current.floor, nodeId).forEach((neighborId) => {
      const neighbor = findMapNode(map, neighborId)
      const traversable = neighborId === targetNodeId
        ? ['available', 'complete'].includes(neighbor?.status)
        : neighbor?.status === 'complete'
      if (!visited.has(neighborId) && traversable) {
        visited.add(neighborId)
        queue.push(neighborId)
      }
    })
  }
  return false
}

export const canTravelToNode = (map, currentNodeId, targetNodeId, developerMode = false) => {
  const target = findMapNode(map, targetNodeId)
  if (!target) return false
  if (developerMode) return true
  if (!currentNodeId) return target.status === 'available'
  const current = findMapNode(map, currentNodeId)
  if (!current || current.floor !== target.floor) return false
  if (!['available', 'complete'].includes(target.status)) return false
  return hasClearedPath(map, currentNodeId, targetNodeId)
}

export const completeAndUnlockNext = (map, nodeId) => {
  const current = findMapNode(map, nodeId)
  if (!current) return map
  const connected = new Set(getConnectedNodeIds(map, current.floor, nodeId))
  const unlockNextFloor = current.type === 'stairs'

  return {
    ...map,
    floors: map.floors.map((floor) => ({
      ...floor,
      nodes: floor.nodes.map((node) => {
        if (node.id === nodeId) return { ...node, status: 'complete', revealState: 'revealed' }
        if (node.floor === current.floor && connected.has(node.id) && node.status === 'locked') {
          return { ...node, status: 'available', revealState: 'revealed' }
        }
        if (unlockNextFloor && node.id === map.floors.find(({ number }) =>
          number === current.floor + 1)?.startNodeId) {
          return { ...node, status: 'available', revealState: 'revealed' }
        }
        return node
      }),
      branches: floor.branches.map((branch) => branch.nodeIds.includes(nodeId)
        && branch.nodeIds.every((id) => id === nodeId || findMapNode(map, id)?.status === 'complete')
        ? { ...branch, completed: true }
        : branch),
    })),
  }
}

export const enterFloorAtStart = (map, floorNumber) => {
  const startNodeId = map.floors.find(({ number }) => number === floorNumber)?.startNodeId ?? null
  return {
    map: startNodeId ? completeAndUnlockNext(map, startNodeId) : map,
    currentNodeId: startNodeId,
  }
}

export const isNodeWithinKnownProgress = (node) =>
  node.revealState === 'revealed' || node.status !== 'locked'

export const validateFloorMap = (floor) => {
  const nodeIds = new Set(floor.nodes.map(({ id }) => id))
  const startCount = floor.nodes.filter(({ type }) => type === 'floor_start').length
  const destinationCount = floor.nodes.filter(({ type }) => ['stairs', 'boss'].includes(type)).length
  const corridorKeys = new Set()
  const errors = []
  if (startCount !== 1) errors.push('시작 방은 정확히 하나여야 합니다.')
  if (destinationCount !== 1) errors.push('계단 또는 보스 방은 정확히 하나여야 합니다.')
  if (floor.nodes.length < 5 || floor.nodes.length > 7) errors.push('난이도 1은 층당 5~7개 방이어야 합니다.')
  if (floor.branches.length !== 1) errors.push('난이도 1은 막다른 브랜치가 하나여야 합니다.')
  floor.corridors.forEach(({ from, to }) => {
    const key = [from, to].sort().join(':')
    if (!nodeIds.has(from) || !nodeIds.has(to)) errors.push('존재하지 않는 방에 연결된 통로가 있습니다.')
    if (from === to) errors.push('자기 자신으로 연결된 통로가 있습니다.')
    if (corridorKeys.has(key)) errors.push('중복 통로가 있습니다.')
    corridorKeys.add(key)
  })
  const reached = new Set([floor.startNodeId])
  const queue = [floor.startNodeId]
  while (queue.length) {
    const current = queue.shift()
    floor.corridors.forEach(({ from, to }) => {
      const next = from === current ? to : to === current ? from : null
      if (next && !reached.has(next)) {
        reached.add(next)
        queue.push(next)
      }
    })
  }
  if (reached.size !== floor.nodes.length) errors.push('시작 방에서 도달할 수 없는 방이 있습니다.')
  if (floor.corridors.length !== floor.nodes.length - 1) errors.push('초기 지도는 순환 없는 트리여야 합니다.')
  floor.branches.forEach((branch) => {
    const endId = branch.nodeIds.at(-1)
    const degree = floor.corridors.filter(({ from, to }) => from === endId || to === endId).length
    if (degree !== 1) errors.push('브랜치 끝은 막다른 방이어야 합니다.')
  })
  return { valid: errors.length === 0, errors }
}
