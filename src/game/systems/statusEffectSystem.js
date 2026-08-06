export const STATUS_EFFECTS = Object.freeze({
  bleeding: { id: 'bleeding', name: '출혈', icon: '🩸', category: 'damage', categoryName: '상태 이상', timing: 'turnEnd', ignoresArmor: true },
  burn: { id: 'burn', name: '화상', icon: '🔥', category: 'damage', categoryName: '상태 이상', timing: 'turnEnd', ignoresArmor: false },
  poison: { id: 'poison', name: '중독', icon: '☠', category: 'damage', categoryName: '상태 이상', timing: 'placement', ignoresArmor: true },
  weakness: { id: 'weakness', name: '약화', icon: '↓', category: 'debuff', categoryName: '디버프', timing: 'outgoingDamage', target: 'damage' },
  wound: { id: 'wound', name: '상처', icon: '✚', category: 'debuff', categoryName: '디버프', timing: 'incomingDamage', target: 'damage' },
  chill: { id: 'chill', name: '오한', icon: '❄', category: 'debuff', categoryName: '디버프', timing: 'armorGain', target: 'armor' },
  stun: { id: 'stun', name: '기절', icon: '★', category: 'control', categoryName: '군중 제어', timing: 'action', target: 'action' },
  rage: { id: 'rage', name: '분노', icon: '↑', category: 'buff', categoryName: '버프', timing: 'outgoingDamage', target: 'damage' },
  armor: { id: 'armor', name: '철갑', icon: '◆', category: 'buff', categoryName: '버프', timing: 'armorGain', target: 'armor' },
})

const COMMON_STATUS_IDS = Object.freeze({
  WEAKNESS: 'weakness',
  WOUND: 'wound',
  CHILL: 'chill',
  BLEED: 'bleeding',
  BURN: 'burn',
  POISON: 'poison',
  STUN: 'stun',
  RAGE: 'rage',
  ARMOR: 'armor',
})

const layerStacks = (layers = []) => layers.reduce((sum, layer) => sum + layer.intensify, 0)
const effectAmount = (status, fallbackRate = 0) => status.layers?.length
  ? status.layers.reduce((sum, layer) => sum + layer.value * layer.intensify, 0)
  : fallbackRate * (status.stacks ?? 0)

export const createStatusUpdateFromEffect = (effect) => {
  const sourceId = effect?.parameters?.id
  const id = COMMON_STATUS_IDS[sourceId]
  if (!id) return null
  const value = Number(effect.value ?? 0)
  const stacks = sourceId === 'STUN' ? 1 : Math.max(0, Number(effect.value ?? 0))
  return {
    id,
    sourceId,
    // 현재 출혈·화상 전용 처리기는 강도를 상태 스택으로 계산한다.
    stacks,
    value,
    duration: Number(effect.parameters?.duration ?? 0),
    intensify: stacks,
  }
}

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
          ...(newlyApplied && ['weakness', 'wound', 'chill'].includes(statusId)
            ? { newlyAppliedStacks: (status.newlyAppliedStacks ?? 0) + nextStacks }
            : {}),
        }
      : status)
    : [...statuses, {
        id: statusId,
        stacks: nextStacks,
        ...(newlyApplied && ['weakness', 'wound', 'chill'].includes(statusId)
          ? { newlyAppliedStacks: nextStacks }
          : {}),
      }]
}

export const addStatusUpdate = (statuses, update, newlyApplied = false) => {
  if (!update || !STATUS_EFFECTS[update.id]) return statuses
  if (update.id === 'stun' && statuses.some(({ id }) => id === 'stun')) return statuses
  if (!Number.isFinite(update.intensify) || update.intensify <= 0) return statuses
  const normalizedValue = update.value
  const layer = {
    value: normalizedValue,
    intensify: ['stun', 'double_attack'].includes(update.id) ? 1 : update.intensify,
    remainingTurns: null,
    ...(newlyApplied ? { newlyApplied: true } : {}),
  }
  const existing = statuses.find(({ id }) => id === update.id)
  if (!existing) {
    return [...statuses, {
      id: update.id,
      stacks: layer.intensify,
      layers: [layer],
      ...(newlyApplied && ['weakness', 'wound', 'chill'].includes(update.id)
        ? { newlyAppliedStacks: layer.intensify }
        : {}),
    }]
  }
  return statuses.map((status) => status.id === update.id
    ? {
        ...status,
        layers: [...(status.layers ?? []), layer],
        stacks: status.stacks + layer.intensify,
        ...(newlyApplied && ['weakness', 'wound', 'chill'].includes(update.id)
          ? { newlyAppliedStacks: (status.newlyAppliedStacks ?? 0) + layer.intensify }
          : {}),
      }
    : status)
}

export const getStatusStacks = (statuses, statusId) =>
  statuses.find(({ id }) => id === statusId)?.stacks ?? 0

export const getWoundMultiplier = (statuses) => {
  const wound = statuses.find(({ id }) => id === 'wound')
  return 1 + (wound?.stacks ?? 0) * 0.1
}

export const getAttackPowerMultiplier = () => 1
export const getAttackReductionMultiplier = (statuses) => {
  const weakness = statuses.find(({ id }) => id === 'weakness')
  return weakness ? Math.max(0, 1 - weakness.stacks * 0.1) : 1
}

export const calculateGeneralDamage = ({
  amount,
  attackerStatuses = [],
  defenderStatuses = [],
}) => Math.max(0, Math.floor(
  amount
  * getAttackPowerMultiplier(attackerStatuses)
  * getAttackReductionMultiplier(attackerStatuses)
  * getWoundMultiplier(defenderStatuses),
))

const getActiveStacks = (status) => status?.layers?.length
  ? status.layers
    .filter(({ newlyApplied }) => !newlyApplied)
    .reduce((sum, layer) => sum + layer.intensify, 0)
  : status?.stacks ?? 0

export const getBuffDamageBonus = (statuses) => {
  const rage = statuses.find(({ id }) => id === 'rage')
  return getActiveStacks(rage)
}

export const getArmorGainBonus = (statuses) => Math.max(0,
  getActiveStacks(statuses.find(({ id }) => id === 'armor'))
  - getActiveStacks(statuses.find(({ id }) => id === 'chill')),
)

export const getPoisonPlacementDamage = (statuses, placedBlockCount = 1) => {
  const stacks = getActiveStacks(statuses.find(({ id }) => id === 'poison'))
  if (stacks <= 0 || placedBlockCount <= 0) return 0
  return Math.max(1, Math.floor(stacks * 0.5)) * placedBlockCount
}

export const getHitCountBonus = (statuses) => {
  const hitCount = statuses.find(({ id }) => id === 'double_attack')
  return hitCount ? effectAmount(hitCount, 1) : 0
}

export const consumeOneShotStatus = (statuses, statusId) =>
  statuses.filter(({ id }) => id !== statusId)

export const resolveTurnEndStatuses = ({
  health,
  armor = 0,
  statuses,
  playerPlacedBlockCount,
  owner = Number.isFinite(playerPlacedBlockCount) ? 'player' : 'monster',
}) => {
  const bleeding = statuses.find(({ id }) => id === 'bleeding')
  const burn = statuses.find(({ id }) => id === 'burn')
  const poison = statuses.find(({ id }) => id === 'poison')
  const bleedingDamage = bleeding
    ? owner === 'player'
      ? Math.max(0, playerPlacedBlockCount) * (bleeding.stacks ?? 0)
      : (bleeding.stacks ?? 0) * 3
    : 0
  const healthAfterBleeding = Math.max(0, health - bleedingDamage)
  const survivedBleeding = healthAfterBleeding > 0
  const rawBurnDamage = burn?.stacks ?? 0
  const absorbedBurn = survivedBleeding ? Math.min(armor, rawBurnDamage) : 0
  const burnDamage = survivedBleeding ? rawBurnDamage - absorbedBurn : 0
  const poisonDamage = owner === 'monster' && survivedBleeding
    ? getActiveStacks(poison) * 3
    : 0
  return {
    health: Math.max(0, healthAfterBleeding - burnDamage - poisonDamage),
    armor: armor - absorbedBurn,
    damage: bleedingDamage + burnDamage + poisonDamage,
    statuses: statuses
      .map((status) => {
        if (status.id === 'bleeding') {
          const layers = (status.layers ?? [])
            .map((layer) => ({
              ...layer,
              intensify: Math.max(0, layer.intensify - 1),
            }))
            .filter(({ intensify }) => intensify > 0)
          return { ...status, layers, stacks: layerStacks(layers) }
        }
        if (status.id === 'burn') {
          if (status.id === 'burn' && !survivedBleeding) return status
          const layers = (status.layers ?? [])
            .map((layer) => ({
              ...layer,
              intensify: Math.floor(layer.intensify / 2),
            }))
            .filter(({ intensify }) => intensify > 0)
          return { ...status, layers, stacks: layerStacks(layers) }
        }
        if (status.id === 'poison') {
          const layers = (status.layers ?? [])
            .map((layer) => layer.newlyApplied
              ? { ...layer, newlyApplied: false }
              : { ...layer, intensify: Math.floor(layer.intensify / 2) })
            .filter(({ intensify }) => intensify > 0)
          return { ...status, layers, stacks: layerStacks(layers) }
        }
        if (!survivedBleeding) return status
        if (['weakness', 'wound', 'chill'].includes(status.id)) {
          const layers = status.layers?.map((layer) => ({
            ...layer,
            newlyApplied: false,
            intensify: layer.newlyApplied
              ? layer.intensify
              : Math.max(0, layer.intensify - 1),
          })).filter(({ intensify }) => intensify > 0)
          if (layers) return { ...status, layers, stacks: layerStacks(layers) }
          const newlyAppliedStacks = Math.min(status.stacks, status.newlyAppliedStacks ?? 0)
          return {
            id: status.id,
            stacks: Math.max(0, status.stacks - newlyAppliedStacks - 1) + newlyAppliedStacks,
          }
        }
        if (['rage', 'armor'].includes(status.id) && status.layers) {
          const layers = status.layers
            .filter(({ newlyApplied }) => newlyApplied)
            .map((layer) => ({ ...layer, newlyApplied: false }))
          return { ...status, layers, stacks: layerStacks(layers) }
        }
        return status
      })
      .filter(({ stacks }) => stacks > 0),
  }
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
