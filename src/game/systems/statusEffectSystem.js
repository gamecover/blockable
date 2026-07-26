export const STATUS_EFFECTS = Object.freeze({
  bleeding: { id: 'bleeding', name: '출혈', icon: '🩸', category: 'damage', categoryName: '상태 이상', timing: 'turnEnd', ignoresArmor: true },
  burn: { id: 'burn', name: '화상', icon: '🔥', category: 'damage', categoryName: '상태 이상', timing: 'turnEnd', ignoresArmor: false },
  weakness: { id: 'weakness', name: '약화', icon: '↓', category: 'debuff', categoryName: '디버프', timing: 'outgoingDamage', target: 'damage' },
  wound: { id: 'wound', name: '상처', icon: '✚', category: 'debuff', categoryName: '디버프', timing: 'incomingDamage', target: 'damage' },
  stun: { id: 'stun', name: '기절', icon: '★', category: 'control', categoryName: '군중 제어', timing: 'action', target: 'action' },
})

export const createCombatantState = () => ({
  attributes: { strength: null, dexterity: null },
  statuses: [],
})

export const addStatus = (statuses, statusId, stacks = 1) => {
  if (!STATUS_EFFECTS[statusId] || stacks <= 0) return statuses
  const nextStacks = statusId === 'stun' ? 1 : stacks
  const existing = statuses.find(({ id }) => id === statusId)
  return existing
    ? statuses.map((status) => status.id === statusId
      ? { ...status, stacks: statusId === 'stun' ? 1 : status.stacks + nextStacks }
      : status)
    : [...statuses, { id: statusId, stacks: nextStacks }]
}

export const resolveTurnEndStatuses = ({ health, armor = 0, statuses, placedCount = 0 }) => {
  const bleedingStacks = statuses.find(({ id }) => id === 'bleeding')?.stacks ?? 0
  const burnStacks = statuses.find(({ id }) => id === 'burn')?.stacks ?? 0
  const bleedingDamage = placedCount * bleedingStacks
  const absorbedBurn = Math.min(armor, burnStacks)
  const burnDamage = burnStacks - absorbedBurn
  return {
    health: Math.max(0, health - bleedingDamage - burnDamage),
    armor: armor - absorbedBurn,
    damage: bleedingDamage + burnDamage,
    statuses: statuses
      .map((status) => {
        if (status.id === 'bleeding') return { ...status, stacks: status.stacks - 1 }
        if (status.id === 'burn') return { ...status, stacks: Math.floor(status.stacks / 2) }
        if (['weakness', 'wound'].includes(status.id)) return { ...status, stacks: status.stacks - 1 }
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
