const calculateDamage = (amount, multiplier, reduction, wound) => Math.max(
  0,
  Math.floor(amount * multiplier * reduction * wound),
)

const describeUpdates = (updates = []) => updates
  .map(({ name, id, stacks }) => `${name ?? id} ${stacks}`)
  .join(', ') || '없음'

export const resolveCombatFormulaPreview = (effects, context = {}) => {
  const damageBonus = Number(context.damageBonus ?? 0)
  const attackMultiplier = Number(context.attackMultiplier ?? 1)
  const attackReductionMultiplier = Number(context.attackReductionMultiplier ?? 1)
  const woundMultiplier = Number(context.woundMultiplier ?? 1)
  const baseDamage = effects.baseDamageEffects.reduce((sum, effect) => sum + effect.amount, 0)
  const independentDamage = effects.independentDamageEffects
    .reduce((sum, effect) => sum + effect.amount, 0)
  const hitCount = Math.max(
    1,
    1 + Number(context.hitCountBonus ?? 0) + Number(effects.hitCountModifier ?? 0),
  )
  const baseResult = calculateDamage(
    baseDamage + damageBonus,
    attackMultiplier,
    attackReductionMultiplier,
    woundMultiplier,
  ) * hitCount
  const independentResult = calculateDamage(
    independentDamage,
    attackMultiplier,
    attackReductionMultiplier,
    woundMultiplier,
  )

  return {
    baseResult,
    independentResult,
    lines: [
      `기본 공격(B) ${baseResult} = ((${baseDamage} + ${damageBonus}) × ${attackMultiplier} × ${attackReductionMultiplier} × ${woundMultiplier}) × ${hitCount}`,
      `독립 공격(A) ${independentResult} = ${independentDamage} × ${attackMultiplier} × ${attackReductionMultiplier} × ${woundMultiplier}`,
      `상태 갱신 · S: ${describeUpdates(effects.playerStatuses)} · C: ${describeUpdates([
        ...effects.statuses,
        ...effects.statusDamageEffects,
      ])}`,
    ],
  }
}
