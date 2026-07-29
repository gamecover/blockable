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

const COMMON_STATUS_IDS = Object.freeze({
  ATTACK_REDUCTION: 'weakness',
  DAMAGE_TAKEN_INCREASE: 'wound',
  BLEEDING: 'bleeding',
  BURN: 'burn',
  STUN: 'stun',
  RAGE: 'rage',
})

const normalizeRate = (value) => Math.abs(value) >= 1 ? value / 100 : value
const layerStacks = (layers = []) => layers.reduce((sum, layer) => sum + layer.intensify, 0)
const effectAmount = (status, fallbackRate = 0) => status.layers?.length
  ? status.layers.reduce((sum, layer) => sum + layer.value * layer.intensify, 0)
  : fallbackRate * (status.stacks ?? 0)
const nextRemainingTurns = (remainingTurns) =>
  remainingTurns === null ? null : remainingTurns - 1
const hasRemainingDuration = (remainingTurns) =>
  remainingTurns === null || remainingTurns > 0

export const createStatusUpdateFromEffect = (effect) => {
  const sourceId = effect?.parameters?.id
  const id = COMMON_STATUS_IDS[sourceId]
  if (!id) return null
  const value = Number(effect.value ?? 0)
  const intensify = Number(effect.parameters?.intensify ?? 0)
  return {
    id,
    sourceId,
    // 현재 출혈·화상 전용 처리기는 강도를 상태 스택으로 계산한다.
    stacks: sourceId === 'STUN' ? 1 : intensify,
    value,
    duration: Number(effect.parameters?.duration ?? 0),
    intensify: sourceId === 'STUN' ? 1 : intensify,
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

export const addStatusUpdate = (statuses, update, newlyApplied = false) => {
  if (!update || !STATUS_EFFECTS[update.id]) return statuses
  if (update.id === 'stun' && statuses.some(({ id }) => id === 'stun')) return statuses
  if (!Number.isFinite(update.intensify) || update.intensify <= 0) return statuses
  const normalizedValue = ['weakness', 'wound'].includes(update.id)
    ? normalizeRate(update.value)
    : update.value
  const layer = {
    value: normalizedValue,
    intensify: ['stun', 'double_attack'].includes(update.id) ? 1 : update.intensify,
    remainingTurns: update.id === 'stun'
      ? 1
      : [-1, -2].includes(update.duration)
        ? null
        : update.duration > 0 ? update.duration : 1,
    ...([-1, -2].includes(update.duration)
      ? { durationMode: update.duration === -2 ? 'permanent' : 'battle' }
      : {}),
    ...(newlyApplied ? { newlyApplied: true } : {}),
  }
  const existing = statuses.find(({ id }) => id === update.id)
  if (!existing) {
    return [...statuses, {
      id: update.id,
      stacks: layer.intensify,
      layers: [layer],
      ...(newlyApplied && ['weakness', 'wound'].includes(update.id)
        ? { newlyAppliedStacks: layer.intensify }
        : {}),
    }]
  }
  return statuses.map((status) => status.id === update.id
    ? {
        ...status,
        layers: [...(status.layers ?? []), layer],
        stacks: status.stacks + layer.intensify,
        ...(newlyApplied && ['weakness', 'wound'].includes(update.id)
          ? { newlyAppliedStacks: (status.newlyAppliedStacks ?? 0) + layer.intensify }
          : {}),
      }
    : status)
}

export const getStatusStacks = (statuses, statusId) =>
  statuses.find(({ id }) => id === statusId)?.stacks ?? 0

export const getWoundMultiplier = (statuses) => {
  const wound = statuses.find(({ id }) => id === 'wound')
  return 1 + (wound ? effectAmount(wound, 0.1) : 0)
}

export const getAttackPowerMultiplier = () => 1
export const getAttackReductionMultiplier = (statuses) => {
  const weakness = statuses.find(({ id }) => id === 'weakness')
  return weakness ? Math.max(0, 1 - effectAmount(weakness, 0.1)) : 1
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

export const getBuffDamageBonus = (statuses) => {
  const rage = statuses.find(({ id }) => id === 'rage')
  return rage ? effectAmount(rage, 1) : 0
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
  placedBlockCount,
  playerPlacedBlockCount,
}) => {
  const bleeding = statuses.find(({ id }) => id === 'bleeding')
  const burn = statuses.find(({ id }) => id === 'burn')
  const bleedingDamage = bleeding
    ? Number.isFinite(playerPlacedBlockCount)
      ? Math.max(0, playerPlacedBlockCount) * (bleeding.stacks ?? 0)
      : (bleeding.layers ?? []).reduce((sum, layer) => {
          const baseValue = layer.value === 0 && Number.isFinite(placedBlockCount)
            ? Math.max(0, placedBlockCount)
            : layer.value
          return sum + baseValue * layer.intensify
        }, 0)
    : 0
  const healthAfterBleeding = Math.max(0, health - bleedingDamage)
  const survivedBleeding = healthAfterBleeding > 0
  const rawBurnDamage = burn?.stacks ?? 0
  const absorbedBurn = survivedBleeding ? Math.min(armor, rawBurnDamage) : 0
  const burnDamage = survivedBleeding ? rawBurnDamage - absorbedBurn : 0
  return {
    health: Math.max(0, healthAfterBleeding - burnDamage),
    armor: armor - absorbedBurn,
    damage: bleedingDamage + burnDamage,
    statuses: statuses
      .map((status) => {
        if (status.id === 'bleeding') {
          const layers = (status.layers ?? [])
            .map((layer) => ({
              ...layer,
              remainingTurns: nextRemainingTurns(layer.remainingTurns),
              intensify: Math.max(0, layer.intensify - 1),
            }))
            .filter(({ remainingTurns, intensify }) =>
              hasRemainingDuration(remainingTurns) && intensify > 0)
          return { ...status, layers, stacks: layerStacks(layers) }
        }
        if (status.id === 'burn') {
          if (status.id === 'burn' && !survivedBleeding) return status
          const layers = (status.layers ?? [])
            .map((layer) => ({
              ...layer,
              remainingTurns: nextRemainingTurns(layer.remainingTurns),
              intensify: Math.floor(layer.intensify / 2),
            }))
            .filter(({ remainingTurns, intensify }) =>
              hasRemainingDuration(remainingTurns) && intensify > 0)
          return { ...status, layers, stacks: layerStacks(layers) }
        }
        if (!survivedBleeding) return status
        if (['weakness', 'wound'].includes(status.id)) {
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
        if (['rage', 'ironclad'].includes(status.id) && status.layers) {
          const layers = status.layers
            .map((layer) => ({
              ...layer,
              newlyApplied: false,
              remainingTurns: layer.newlyApplied
                ? layer.remainingTurns
                : nextRemainingTurns(layer.remainingTurns),
            }))
            .filter(({ remainingTurns }) => hasRemainingDuration(remainingTurns))
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
