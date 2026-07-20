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
  return floors
}

export const completeAndUnlockNext = (map, nodeId) => {
  const current = map.flat().find((node) => node.id === nodeId)
  if (!current) return map
  return map.map((nodes, floorIndex) => nodes.map((node) => {
    if (node.id === nodeId) return { ...node, status: 'complete' }
    if (floorIndex === current.floor) return { ...node, status: 'available' }
    return node
  }))
}
