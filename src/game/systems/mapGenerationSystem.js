import { MAX_FLOOR } from '../constants/gameConfig.js'

export const generateMap = (random = Math.random) => {
  const floors = []
  for (let floor = 1; floor <= MAX_FLOOR; floor += 1) {
    const count = floor === 1 || floor === MAX_FLOOR ? 1 : 2 + Math.floor(random() * 2)
    floors.push(Array.from({ length: count }, (_, lane) => ({
      id: `${floor}-${lane}`,
      floor,
      lane,
      type: floor === MAX_FLOOR ? 'boss' : floor === 1 ? 'battle' : random() < 0.66 ? 'battle' : 'event',
      status: floor === 1 ? 'available' : 'locked',
    })))
  }
  return floors.map((nodes, floorIndex) => nodes.map((node) => ({
    ...node,
    nextNodeIds: createNextNodeIds(node, nodes.length, floors[floorIndex + 1] ?? []),
  })))
}

const createNextNodeIds = (node, currentCount, nextNodes) => {
  if (!nextNodes.length) return []
  if (currentCount === 1) return nextNodes.map(({ id }) => id)
  const center = Math.round((node.lane / (currentCount - 1)) * (nextNodes.length - 1))
  const candidates = [center]
  if (nextNodes.length > currentCount) candidates.push(node.lane < currentCount / 2 ? center + 1 : center - 1)
  return [...new Set(candidates)].filter((lane) => nextNodes[lane]).map((lane) => nextNodes[lane].id)
}

export const getNextNodeIds = (map, node) => {
  if (Array.isArray(node.nextNodeIds)) return node.nextNodeIds
  return (map[node.floor] ?? []).map(({ id }) => id)
}

export const getMapNodePosition = (map, node) => {
  const nodes = map[node.floor - 1] ?? [node]
  return {
    x: 6 + ((node.floor - 1) / (MAX_FLOOR - 1)) * 88,
    y: nodes.length === 1 ? 50 : 18 + (node.lane / (nodes.length - 1)) * 64,
  }
}

export const getMapEdges = (map) => map.flatMap((nodes) => nodes.flatMap((node) =>
  getNextNodeIds(map, node).map((targetId) => ({ from: node.id, to: targetId }))))

export const completeAndUnlockNext = (map, nodeId) => {
  const current = map.flat().find((node) => node.id === nodeId)
  if (!current) return map
  const nextNodeIds = new Set(getNextNodeIds(map, current))
  return map.map((nodes, floorIndex) => nodes.map((node) => {
    if (node.id === nodeId) return { ...node, status: 'complete' }
    if (node.floor === current.floor) return { ...node, status: 'locked' }
    if (floorIndex === current.floor && nextNodeIds.has(node.id)) return { ...node, status: 'available' }
    return node
  }))
}
