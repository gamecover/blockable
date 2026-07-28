export const STATUS_EFFECTS = Object.freeze({
  bleeding: { id: 'bleeding', name: '출혈', icon: '🩸', category: 'damage', categoryName: '상태 이상', timing: 'turnEnd', ignoresArmor: true },
  burn: { id: 'burn', name: '화상', icon: '🔥', category: 'damage', categoryName: '상태 이상', timing: 'turnEnd', ignoresArmor: false },
  weakness: { id: 'weakness', name: '약화', icon: '↓', category: 'debuff', categoryName: '디버프', timing: 'outgoingDamage', target: 'damage' },
  wound: { id: 'wound', name: '상처', icon: '✚', category: 'debuff', categoryName: '디버프', timing: 'incomingDamage', target: 'damage' },
  stun: { id: 'stun', name: '기절', icon: '★', category: 'control', categoryName: '군중 제어', timing: 'action', target: 'action' },
  rage: { id: 'rage', name: '분노', icon: '↑', category: 'buff', categoryName: '버프', timing: 'outgoingDamage', target: 'damage' },
  ironclad: { id: 'ironclad', name: '철갑', icon: '◆', category: 'buff', categoryName: '버프', timing: 'immediate', target: 'armor' },
  double_attack: { id: 'double_attack', name: '연속 공격', icon: '×2', category: 'buff', categoryName: '버프', timing: 'outgoingDamage', target: 'hitCount' },
})

export const createCombatantState = () => ({
  attributes: { strength: null, dexterity: null },
  statuses: [],
})

export const addStatus = (statuses, statusId, stacks = 1, newlyApplied = false) => {
  if (!STATUS_EFFECTS[statusId] || stacks <= 0) return statuses
  const nextStacks = statusId === 'stun' ? 1 : stacks
  const existing = statuses.find(({ id }) => id === statusId)
  return existing
    ? statuses.map((status) => status.id === statusId
      ? {
          ...status,
          stacks: statusId === 'stun' ? 1 : status.stacks + nextStacks,
          ...(newlyApplied && ['weakness', 'wound'].includes(statusId)
            ? { newlyAppliedStacks: (status.newlyAppliedStacks ?? 0) + nextStacks }
            : {}),
        }
      : status)
    : [...statuses, {
        id: statusId,
        stacks: nextStacks,
        ...(newlyApplied && ['weakness', 'wound'].includes(statusId)
          ? { newlyAppliedStacks: nextStacks }
          : {}),
      }]
}

export const getStatusStacks = (statuses, statusId) =>
  statuses.find(({ id }) => id === statusId)?.stacks ?? 0

export const getDamageMultiplier = (statuses, direction) => {
  if (direction === 'outgoing') {
    const weakness = getStatusStacks(statuses, 'weakness')
    return Math.max(0, 1 - weakness * 0.1)
  }
  const wound = getStatusStacks(statuses, 'wound')
  return 1 + wound * 0.1
}

export const getBuffDamageBonus = (statuses) => getStatusStacks(statuses, 'rage')

export const resolveTurnEndStatuses = ({ health, armor = 0, statuses, placedCount = 0 }) => {
  const bleedingStacks = statuses.find(({ id }) => id === 'bleeding')?.stacks ?? 0
  const burnStacks = statuses.find(({ id }) => id === 'burn')?.stacks ?? 0
  const bleedingDamage = placedCount * bleedingStacks
  const healthAfterBleeding = Math.max(0, health - bleedingDamage)
  const survivedBleeding = healthAfterBleeding > 0
  const absorbedBurn = survivedBleeding ? Math.min(armor, burnStacks) : 0
  const burnDamage = survivedBleeding ? burnStacks - absorbedBurn : 0
  return {
    health: Math.max(0, healthAfterBleeding - burnDamage),
    armor: armor - absorbedBurn,
    damage: bleedingDamage + burnDamage,
    statuses: statuses
      .map((status) => {
        if (status.id === 'bleeding') return { ...status, stacks: status.stacks - 1 }
        if (status.id === 'burn' && survivedBleeding) return { ...status, stacks: Math.floor(status.stacks / 2) }
        if (!survivedBleeding) return status
        if (['weakness', 'wound'].includes(status.id)) {
          const newlyAppliedStacks = Math.min(status.stacks, status.newlyAppliedStacks ?? 0)
          const existingStacks = status.stacks - newlyAppliedStacks
          return {
            id: status.id,
            stacks: Math.max(0, existingStacks - 1) + newlyAppliedStacks,
          }
        }
        return status
      })
      .filter(({ stacks }) => stacks > 0),
  }
}

export const applyWeakness = (damage, statuses) => {
  const stacks = statuses.find(({ id }) => id === 'weakness')?.stacks ?? 0
  return Math.max(0, Math.floor(damage * Math.max(0, 1 - stacks * 0.1)))
}

export const applyWound = (damage, statuses) => {
  const stacks = statuses.find(({ id }) => id === 'wound')?.stacks ?? 0
  return Math.max(0, Math.floor(damage * (1 + stacks * 0.1)))
}

export const consumeStun = (statuses) => {
  const stunned = statuses.some(({ id, stacks }) => id === 'stun' && stacks > 0)
  return {
    skipAction: stunned,
    statuses: stunned
      ? statuses
        .map((status) => status.id === 'stun' ? { ...status, stacks: status.stacks - 1 } : status)
        .filter(({ stacks }) => stacks > 0)
      : statuses,
  }
}
