import { getSpawnableMonsters, pickMonsterEncounter } from './monsterDesignSystem.js'

export const MONSTER_SLOT_IDS = Object.freeze([1, 2, 3, 4, 5])

export const getConnectedSlotIds = (slotId, battleType) => {
  if (battleType === 'boss') {
    if (slotId === 5) return [1, 2, 3, 4]
    return [...new Set([slotId - 1, slotId + 1, 5].filter((id) => id >= 1 && id <= 5))]
  }
  return [slotId - 1, slotId + 1].filter((id) => id >= 1 && id <= 4)
}

export const getTargetSlotIds = ({
  centerSlotId,
  range = 'single',
  distance = 1,
  battleType = 'normal',
  occupiedSlotIds = [],
}) => {
  if (range === 'all') return [...occupiedSlotIds]
  const result = new Set([centerSlotId])
  if (battleType === 'boss' && centerSlotId === 5 && range !== 'single') {
    getConnectedSlotIds(5, battleType).forEach((id) => result.add(id))
  } else {
    if (['left', 'both'].includes(range)) {
      for (let offset = 1; offset <= distance; offset += 1) result.add(centerSlotId - offset)
    }
    if (['right', 'both'].includes(range)) {
      for (let offset = 1; offset <= distance; offset += 1) result.add(centerSlotId + offset)
    }
    if (battleType === 'boss' && range !== 'single') result.add(5)
  }
  return [...result].filter((id) => occupiedSlotIds.includes(id))
}

export const createCombatSlots = ({
  node,
  floor,
  difficultyTier,
  dungeonId = 'all',
  bossEncounterHistory = [],
  random = Math.random,
}) => {
  const battleType = node.type === 'boss' ? 'boss' : 'normal'
  const eliteAvailable = node.type === 'elite'
    && getSpawnableMonsters({ floor, dungeonId, gradeId: 'elite' }).length > 0
  const spawnGrade = node.type === 'elite'
    ? (eliteAvailable ? 'elite' : 'normal')
    : node.grade === 'horde' ? 'horde' : 'normal'
  const monsterCount = battleType === 'boss'
    ? 0
    : spawnGrade === 'elite' || (spawnGrade === 'normal' && node.type !== 'elite')
      ? 1
      : 2 + Math.floor(random() * 2)
  const normalSlots = Array.from({ length: monsterCount }, (_, index) => {
    const monster = pickMonsterEncounter({
      floor,
      difficultyTier,
      dungeonId,
      gradeId: spawnGrade,
      random,
    })
    return { ...monster, instanceId: `${monster.id}-${index + 1}`, slotId: index + 1 }
  })
  if (battleType === 'normal') return { battleType, monsters: normalSlots }
  const bossPool = getSpawnableMonsters({ floor, dungeonId, gradeId: 'boss' })
  const encounteredBossIds = new Set(bossEncounterHistory)
  const resetBossEncounterHistory = bossPool.length > 0
    && bossPool.every(({ id }) => encounteredBossIds.has(id))
  const boss = pickMonsterEncounter({
    floor,
    difficultyTier,
    dungeonId,
    gradeId: 'boss',
    excludedIds: resetBossEncounterHistory ? [] : bossEncounterHistory,
    random,
  })
  return {
    battleType,
    monsters: [{ ...boss, instanceId: `${boss.id}-boss`, slotId: 5 }],
    bossEncounterId: boss.id,
    resetBossEncounterHistory,
  }
}

export const isCombatVictory = (battleType, monsters) =>
  battleType === 'boss'
    ? (monsters.find(({ slotId }) => slotId === 5)?.currentHealth ?? 0) <= 0
    : monsters.every(({ currentHealth }) => currentHealth <= 0)
