import { DEFAULT_DUNGEON } from '../constants/gameConfig.js'

export const MAP_SCHEMA_VERSION = 2
export const MAP_GENERATOR_VERSION = '0.6.3'

const createDifficultyConfig = (difficulty, floorCount, nodes, mainPath, branches, branchLength, riskBranches) => Object.freeze({
  difficulty,
  floorCount,
  nodesPerFloor: { min: nodes[0], max: nodes[1] },
  mainPathLength: { min: mainPath[0], max: mainPath[1] },
  branchCount: { min: branches[0], max: branches[1] },
  branchLength: { min: branchLength[0], max: branchLength[1] },
  maxBranchDepth: branchLength[1],
  riskBranchCount: { min: riskBranches[0], max: riskBranches[1] },
  additionalRestChance: { standard: 0.02, branchEnd: 0.05 },
  maxAdditionalRestRooms: 1,
})

export const DIFFICULTY_CONFIGS = Object.freeze({
  1: createDifficultyConfig(1, 2, [7, 9], [3, 5], [2, 3], [1, 2], [0, 1]),
  2: createDifficultyConfig(2, 2, [6, 8], [3, 4], [1, 2], [1, 2], [0, 1]),
  3: createDifficultyConfig(3, 3, [7, 9], [4, 5], [2, 2], [1, 2], [1, 1]),
  4: createDifficultyConfig(4, 3, [7, 10], [4, 5], [2, 2], [1, 2], [1, 1]),
  5: createDifficultyConfig(5, 3, [8, 11], [4, 6], [2, 3], [1, 2], [1, 1]),
  6: createDifficultyConfig(6, 3, [9, 12], [5, 6], [2, 3], [1, 3], [1, 2]),
  7: createDifficultyConfig(7, 4, [9, 12], [5, 6], [3, 3], [1, 3], [1, 2]),
  8: createDifficultyConfig(8, 4, [10, 13], [5, 7], [3, 3], [1, 3], [2, 2]),
  9: createDifficultyConfig(9, 4, [10, 13], [6, 7], [3, 4], [1, 3], [2, 2]),
  10: createDifficultyConfig(10, 4, [11, 14], [6, 8], [3, 4], [1, 3], [2, 2]),
})

export const DIFFICULTY_ONE_CONFIG = DIFFICULTY_CONFIGS[1]

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

const pickRoomType = (random, config, { branchEnd = false, allowRest = true } = {}) => {
  if (branchEnd) {
    return allowRest && random() < config.additionalRestChance.branchEnd
      ? 'rest'
      : 'event'
  }
  const roll = random()
  if (roll < 0.58) return 'battle'
  if (roll < 0.98) return 'event'
  return allowRest ? 'rest' : 'battle'
}

const createMainPathPositions = (nodeCount, random) => {
  const edgeIndexes = Array.from({ length: nodeCount - 1 }, (_, index) => index + 1)
  const bendCount = nodeCount >= 5 && random() < 0.5 ? 2 : 1
  const bends = new Set()
  while (bends.size < bendCount) {
    bends.add(pick(edgeIndexes, random))
  }
  const sortedBends = [...bends].sort((a, b) => a - b)
  const firstDirection = random() < 0.5 ? -1 : 1
  let y = 0
  return Array.from({ length: nodeCount }, (_, index) => {
    const bendOrder = sortedBends.indexOf(index)
    if (bendOrder >= 0) {
      y += bendOrder === 0 || random() < 0.65 ? firstDirection : -firstDirection
    }
    return { x: index, y }
  })
}

const distributeBranchLengths = (branchCount, nodeBudget, random, config) => {
  const lengths = Array.from({ length: branchCount }, () => 1)
  let remaining = nodeBudget - branchCount
  while (remaining > 0) {
    const candidates = lengths
      .map((length, index) => length < config.branchLength.max ? index : null)
      .filter((index) => index !== null)
    if (!candidates.length) break
    lengths[pick(candidates, random)] += 1
    remaining -= 1
  }
  return lengths
}

const pickFloorShape = (targetNodeCount, config, random) => {
  const candidates = []
  for (let branchCount = config.branchCount.min; branchCount <= config.branchCount.max; branchCount += 1) {
    for (let mainPathLength = config.mainPathLength.min; mainPathLength <= config.mainPathLength.max; mainPathLength += 1) {
      const branchNodeBudget = targetNodeCount - (mainPathLength + 1)
      if (branchCount > mainPathLength - 1) continue
      if (branchNodeBudget < branchCount * config.branchLength.min) continue
      if (branchNodeBudget > branchCount * config.branchLength.max) continue
      candidates.push({ branchCount, mainPathLength, branchNodeBudget })
    }
  }
  return pick(candidates, random)
}

const createFloor = (floor, floorCount, random, config) => {
  const targetNodeCount = randomInteger(random, config.nodesPerFloor.min, config.nodesPerFloor.max)
  const floorShape = pickFloorShape(targetNodeCount, config, random)
  if (!floorShape) {
    throw new Error(`난이도 ${config.difficulty}의 노드 ${targetNodeCount}개를 생성할 수 있는 경로 구성이 없습니다.`)
  }
  const {
    branchCount: desiredBranchCount,
    mainPathLength,
    branchNodeBudget,
  } = floorShape
  const mainNodeCount = mainPathLength + 1
  const branchLengths = distributeBranchLengths(
    desiredBranchCount,
    branchNodeBudget,
    random,
    config,
  )
  const mainPositions = createMainPathPositions(mainNodeCount, random)
  const isFinalFloor = floor === floorCount
  const availableAnchorIndexes = Array.from(
    { length: mainNodeCount - 2 },
    (_, index) => index + 1,
  )
  const branchAnchorIndexes = Array.from({ length: desiredBranchCount }, () => {
    const anchorIndex = pick(availableAnchorIndexes, random)
    availableAnchorIndexes.splice(availableAnchorIndexes.indexOf(anchorIndex), 1)
    return anchorIndex
  }).sort((a, b) => a - b)
  const firstBranchDirection = random() < 0.5 ? -1 : 1
  const riskBranchCount = randomInteger(
    random,
    Math.min(config.riskBranchCount.min, desiredBranchCount),
    Math.min(config.riskBranchCount.max, desiredBranchCount),
  )
  const riskBranchIndexes = new Set()
  while (riskBranchIndexes.size < riskBranchCount) {
    riskBranchIndexes.add(randomInteger(random, 0, desiredBranchCount - 1))
  }
  const restNodeIndex = Math.ceil((mainNodeCount - 1) / 2)
  const nodes = []
  const corridors = []
  let additionalRestCount = 0

  for (let index = 0; index < mainNodeCount; index += 1) {
    const isStart = index === 0
    const isDestination = index === mainNodeCount - 1
    const isGuaranteedRest = index === restNodeIndex
    let type
    if (isStart) type = 'floor_start'
    else if (isDestination) type = isFinalFloor ? 'boss' : 'stairs'
    else if (isGuaranteedRest) type = 'rest'
    else {
      type = pickRoomType(random, config, {
        allowRest: additionalRestCount < config.maxAdditionalRestRooms,
      })
      if (type === 'rest') additionalRestCount += 1
    }
    if (isFinalFloor && index === mainNodeCount - 2 && !['battle', 'rest'].includes(type)) {
      const allowRest = additionalRestCount < config.maxAdditionalRestRooms
      type = allowRest && random() < config.additionalRestChance.standard ? 'rest' : 'battle'
      if (type === 'rest') additionalRestCount += 1
    }
    const id = `f${floor}_n${index + 1}`
    nodes.push(createNode({
      id,
      floor,
      type,
      grade: type === 'battle' ? (random() < 0.2 ? 'named' : 'normal') : type === 'boss' ? 'boss' : null,
      pathRole: 'main',
      position: mainPositions[index],
      available: floor === 1 && isStart,
      finalBoss: type === 'boss',
    }))
    if (index > 0) {
      corridors.push(createCorridor(floor, corridors.length + 1, `f${floor}_n${index}`, id, 'main'))
    }
  }

  const branches = branchLengths.map((branchLength, branchIndex) => {
    const branchId = `f${floor}_b${branchIndex + 1}`
    const branchAnchorIndex = branchAnchorIndexes[branchIndex]
    const branchDirection = branchIndex % 2 === 0
      ? firstBranchDirection
      : -firstBranchDirection
    const isRiskBranch = riskBranchIndexes.has(branchIndex)
    const branchNodeIds = []
    let previousId = `f${floor}_n${branchAnchorIndex + 1}`

    for (let depth = 1; depth <= branchLength; depth += 1) {
      const id = `f${floor}_n${nodes.length + 1}`
      const isEnd = depth === branchLength
      const allowRest = additionalRestCount < config.maxAdditionalRestRooms
      const type = isRiskBranch && isEnd
        ? 'elite'
        : pickRoomType(random, config, { branchEnd: isEnd, allowRest })
      if (type === 'rest') additionalRestCount += 1
      nodes.push(createNode({
        id,
        floor,
        type,
        grade: type === 'elite' ? 'named' : type === 'battle' ? 'normal' : null,
        pathRole: isRiskBranch ? 'risk' : 'branch',
        branchId,
        branchDepth: depth,
        position: {
          x: branchAnchorIndex,
          y: mainPositions[branchAnchorIndex].y + branchDirection * depth,
        },
      }))
      corridors.push(createCorridor(
        floor,
        corridors.length + 1,
        previousId,
        id,
        isRiskBranch ? 'risk' : 'branch',
        branchId,
      ))
      branchNodeIds.push(id)
      previousId = id
    }

    return {
      id: branchId,
      type: isRiskBranch ? 'risk' : 'normal',
      anchorNodeId: `f${floor}_n${branchAnchorIndex + 1}`,
      nodeIds: branchNodeIds,
      depth: branchLength,
      completed: false,
    }
  })

  return {
    id: `f${floor}`,
    number: floor,
    targetNodeCount,
    actualNodeCount: nodes.length,
    mainPathLength,
    startNodeId: `f${floor}_n1`,
    destinationNodeId: `f${floor}_n${mainNodeCount}`,
    nodes,
    corridors,
    branches,
  }
}

export const generateMap = ({
  seed = Math.floor(Math.random() * 4294967296),
  dungeonId = DEFAULT_DUNGEON.id,
  dungeonName = DEFAULT_DUNGEON.name,
  difficulty = 1,
} = {}) => {
  const random = createSeededRandom(seed)
  const normalizedDifficulty = Math.min(10, Math.max(1, Math.trunc(Number(difficulty) || 1)))
  const config = DIFFICULTY_CONFIGS[normalizedDifficulty]
  return {
    schemaVersion: MAP_SCHEMA_VERSION,
    generatorVersion: MAP_GENERATOR_VERSION,
    dungeonId,
    dungeonName,
    difficulty: normalizedDifficulty,
    seed,
    floors: Array.from(
      { length: config.floorCount },
      (_, index) => createFloor(index + 1, config.floorCount, random, config),
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
  if (floor.nodes.length < 7 || floor.nodes.length > 9) errors.push('난이도 1은 층당 7~9개 방이어야 합니다.')
  if (floor.branches.length < 2 || floor.branches.length > 3) {
    errors.push('난이도 1은 막다른 브랜치가 2~3개여야 합니다.')
  }
  if (floor.mainPathLength < 3 || floor.mainPathLength > 5) {
    errors.push('난이도 1의 주 경로 길이는 3~5여야 합니다.')
  }
  const mainNodes = floor.nodes.filter(({ pathRole }) => pathRole === 'main')
  if (new Set(mainNodes.map(({ position }) => position.y)).size < 2) {
    errors.push('난이도 1의 주 경로에는 최소 한 번의 상하 이동이 있어야 합니다.')
  }
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
