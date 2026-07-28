import { pickMonsterEncounter } from './monsterDesignSystem.js'

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
  random = Math.random,
}) => {
  const battleType = node.type === 'boss' ? 'boss' : 'normal'
  const isEliteEncounter = node.type === 'elite' || node.grade === 'named'
  const normalCount = battleType === 'boss'
    ? 0
    : isEliteEncounter
      ? 2 + Math.floor(random() * 2)
      : 1 + Math.floor(random() * 2)
  const normalSlots = Array.from({ length: normalCount }, (_, index) => {
    const monster = pickMonsterEncounter({
      floor,
      difficultyTier,
      gradeId: isEliteEncounter ? 'named' : 'normal',
      random,
    })
    return { ...monster, instanceId: `${monster.id}-${index + 1}`, slotId: index + 1 }
  })
  if (battleType === 'normal') return { battleType, monsters: normalSlots }
  const boss = pickMonsterEncounter({ floor, difficultyTier, gradeId: 'boss', random })
  return {
    battleType,
    monsters: [{ ...boss, instanceId: `${boss.id}-boss`, slotId: 5 }],
  }
}

export const isCombatVictory = (battleType, monsters) =>
  battleType === 'boss'
    ? (monsters.find(({ slotId }) => slotId === 5)?.currentHealth ?? 0) <= 0
    : monsters.every(({ currentHealth }) => currentHealth <= 0)
