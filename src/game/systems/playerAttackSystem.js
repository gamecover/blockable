import { getTargetSlotIds } from './combatSlotSystem.js'
import {
  addStatusUpdate,
  calculateGeneralDamage,
  getBuffDamageBonus,
  getHitCountBonus,
} from './statusEffectSystem.js'

const groupDamageEffects = (effects) => [...effects.reduce((groups, effect) => {
  const key = effect.packetId
    ? `${effect.target}:${effect.range}:${effect.distance}:${effect.packetId}`
    : `${effect.target}:${effect.range}:${effect.distance}`
  const current = groups.get(key)
  groups.set(key, current
    ? { ...current, amount: current.amount + effect.amount }
    : { ...effect })
  return groups
}, new Map()).values()]

const applyDamage = (combatant, rawDamage, attackerStatuses) => {
  const damage = calculateGeneralDamage({
    amount: rawDamage,
    attackerStatuses,
    defenderStatuses: combatant.statuses,
  })
  const absorbed = Math.min(combatant.armor, damage)
  return {
    combatant: {
      ...combatant,
      armor: combatant.armor - absorbed,
      currentHealth: Math.max(0, combatant.currentHealth - (damage - absorbed)),
    },
    damage,
  }
}

const applyDamageGroup = ({ combatants, effect, selectedSlotId, battleType, attackerStatuses }) => {
  const livingSlotIds = combatants.filter(({ currentHealth }) => currentHealth > 0).map(({ slotId }) => slotId)
  const targetSlotIds = effect.range === 'all'
    ? livingSlotIds
    : getTargetSlotIds({
        centerSlotId: selectedSlotId,
        range: effect.range,
        distance: effect.distance,
        battleType,
        occupiedSlotIds: livingSlotIds,
      })
  const damageBySlot = new Map()
  const nextCombatants = combatants.map((entry) => {
    if (!targetSlotIds.includes(entry.slotId) || entry.currentHealth <= 0) return entry
    const applied = applyDamage(entry, effect.amount, attackerStatuses)
    damageBySlot.set(entry.slotId, applied.damage)
    return applied.combatant
  })
  return { combatants: nextCombatants, damageBySlot }
}

const mergeDamage = (target, source) => {
  source.forEach((amount, slotId) => target.set(slotId, (target.get(slotId) ?? 0) + amount))
}

export const getPlayerTargetSlotIds = ({
  combatants,
  selectedMonsterId,
  battleType,
  effects,
}) => {
  const selectedSlotId = combatants.find(({ instanceId }) =>
    instanceId === selectedMonsterId)?.slotId
  if (!selectedSlotId) return []
  const livingSlotIds = combatants.filter(({ currentHealth }) =>
    currentHealth > 0).map(({ slotId }) => slotId)
  const damageEffects = [
    ...(effects.baseDamageEffects ?? []),
    ...(effects.independentDamageEffects ?? []),
    ...(effects.statusDamageEffects ?? []),
    ...(effects.statuses ?? []),
  ]
  return [...new Set(damageEffects.flatMap((effect) =>
    effect.range === 'all'
      ? livingSlotIds
      : getTargetSlotIds({
          centerSlotId: selectedSlotId,
          range: effect.range,
          distance: effect.distance,
          battleType,
          occupiedSlotIds: livingSlotIds,
        })))]
}

export const resolvePlayerAction = ({
  combatants,
  selectedMonsterId,
  battleType,
  effects,
  playerStatuses = [],
}) => {
  let nextCombatants = combatants
  const initialTarget = combatants.find(({ instanceId }) => instanceId === selectedMonsterId)
  const selectedSlotId = initialTarget?.slotId
  const damageBySlot = new Map()
  const baseGroups = groupDamageEffects(effects.baseDamageEffects ?? [])
    .map((effect, index) => index === 0
      ? { ...effect, amount: effect.amount + getBuffDamageBonus(playerStatuses) }
      : effect)
  const independentGroups = groupDamageEffects(effects.independentDamageEffects ?? [])
  const hitCount = Math.max(1, 1
    + getHitCountBonus(playerStatuses)
    + Number(effects.hitCountModifier ?? 0))

  let baseAttackCancelled = !initialTarget || initialTarget.currentHealth <= 0
  let bossDefeated = false
  for (let hit = 0; hit < hitCount && !baseAttackCancelled && !bossDefeated; hit += 1) {
    for (const effect of baseGroups) {
      const center = nextCombatants.find(({ slotId }) => slotId === selectedSlotId)
      if (effect.range !== 'all' && (!center || center.currentHealth <= 0)) {
        baseAttackCancelled = true
        break
      }
      const applied = applyDamageGroup({
        combatants: nextCombatants,
        effect,
        selectedSlotId,
        battleType,
        attackerStatuses: playerStatuses,
      })
      nextCombatants = applied.combatants
      mergeDamage(damageBySlot, applied.damageBySlot)
      bossDefeated = battleType === 'boss'
        && nextCombatants.some(({ slotId, currentHealth }) => slotId === 5 && currentHealth <= 0)
      if (bossDefeated) break
    }
  }

  independentGroups.forEach((effect) => {
    if (bossDefeated) return
    const center = nextCombatants.find(({ slotId }) => slotId === selectedSlotId)
    if (effect.range !== 'all' && (!center || center.currentHealth <= 0)) return
    const applied = applyDamageGroup({
      combatants: nextCombatants,
      effect,
      selectedSlotId,
      battleType,
      attackerStatuses: playerStatuses,
    })
    nextCombatants = applied.combatants
    mergeDamage(damageBySlot, applied.damageBySlot)
    bossDefeated = battleType === 'boss'
      && nextCombatants.some(({ slotId, currentHealth }) => slotId === 5 && currentHealth <= 0)
  })

  const statusTarget = nextCombatants.find(({ slotId }) => slotId === selectedSlotId)
  if (!bossDefeated && statusTarget?.currentHealth > 0) {
    const statusDamageEffects = effects.statusDamageEffects ?? []
    const statusDamageBySlot = new Map()
    statusDamageEffects.forEach((status) => {
      const livingSlotIds = nextCombatants
        .filter(({ currentHealth }) => currentHealth > 0)
        .map(({ slotId }) => slotId)
      const targetSlotIds = status.range === 'all'
        ? livingSlotIds
        : getTargetSlotIds({
            centerSlotId: selectedSlotId,
            range: status.range ?? 'single',
            distance: status.distance ?? 0,
            battleType,
            occupiedSlotIds: livingSlotIds,
          })
      targetSlotIds.forEach((slotId) => {
        const statuses = statusDamageBySlot.get(slotId) ?? []
        statusDamageBySlot.set(slotId, [...statuses, status])
      })
    })
    const commonStatusBySlot = new Map()
    ;(effects.statuses ?? []).forEach((status) => {
      const livingSlotIds = nextCombatants
        .filter(({ currentHealth }) => currentHealth > 0)
        .map(({ slotId }) => slotId)
      const targetSlotIds = status.range === 'all'
        ? livingSlotIds
        : getTargetSlotIds({
            centerSlotId: selectedSlotId,
            range: status.range ?? 'single',
            distance: status.distance ?? 0,
            battleType,
            occupiedSlotIds: livingSlotIds,
          })
      targetSlotIds.forEach((slotId) => {
        const statuses = commonStatusBySlot.get(slotId) ?? []
        commonStatusBySlot.set(slotId, [...statuses, status])
      })
    })
    nextCombatants = nextCombatants.map((entry) => {
      const commonStatuses = commonStatusBySlot.get(entry.slotId) ?? []
      return commonStatuses.length
        ? {
            ...entry,
            statuses: commonStatuses.reduce(
              (statuses, status) => addStatusUpdate(statuses, status, true),
              entry.statuses,
            ),
          }
        : entry
    }).map((entry) => {
      const statusDamage = statusDamageBySlot.get(entry.slotId) ?? []
      if (!statusDamage.length) return entry
      return {
        ...entry,
        statuses: statusDamage.reduce(
          (statuses, status) => addStatusUpdate(statuses, status, true),
          entry.statuses,
        ),
      }
    })
  }

  return {
    combatants: nextCombatants,
    damageBySlot,
    baseAttackPerHit: baseGroups.reduce((sum, effect) => sum + effect.amount, 0),
    independentDamage: independentGroups.reduce((sum, effect) => sum + effect.amount, 0),
    hitCount,
    baseAttackCancelled,
    bossDefeated,
  }
}
