export const WORLD_DUNGEONS = Object.freeze([
  {
    id: 'ashen-forge-west',
    name: '침수된 주조장',
    kind: 'normal',
    difficulty: 1,
    position: { x: 27.9167, y: 39.5926 },
  },
  {
    id: 'ashen-forge-east',
    name: '잿빛 단조장',
    kind: 'normal',
    difficulty: 1,
    position: { x: 73.3333, y: 43.3333 },
  },
  {
    id: 'great-forge',
    name: '중앙 대용광로',
    kind: 'final',
    difficulty: 1,
    position: { x: 50.5833, y: 43.6111 },
  },
])

export const createWorldMapState = () => ({
  requiredClearCount: 2,
  dungeons: WORLD_DUNGEONS.map((dungeon) => ({
    ...dungeon,
    status: 'available',
  })),
})

export const completeWorldDungeon = (worldMap, dungeonId) => {
  const completed = worldMap.dungeons.map((dungeon) =>
    dungeon.id === dungeonId ? { ...dungeon, status: 'complete' } : dungeon)
  return {
    ...worldMap,
    dungeons: completed,
  }
}

export const canEnterWorldDungeon = (dungeon, developerMode = false) =>
  developerMode || dungeon.status === 'available'
