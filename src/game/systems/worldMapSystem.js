export const WORLD_DUNGEONS = Object.freeze([
  {
    id: 'ashen-forge-west',
    name: '침수된 주조장',
    kind: 'normal',
    difficulty: 1,
    position: { x: 30, y: 47 },
  },
  {
    id: 'ashen-forge-east',
    name: '잿빛 용광로',
    kind: 'normal',
    difficulty: 1,
    position: { x: 76.5, y: 50 },
  },
  {
    id: 'great-forge',
    name: '중앙 대용광로',
    kind: 'final',
    difficulty: 1,
    position: { x: 53.5, y: 48.5 },
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
