export const normalizeCombatEffectV054 = (rawEffect) => {
  return [{
    ...rawEffect,
    type: rawEffect?.type,
    value: Number(rawEffect?.value ?? 0),
    parameters: { ...(rawEffect?.parameters ?? {}) },
  }]
}

export const normalizeCombatEffectsV054 = (effects = []) =>
  effects.flatMap(normalizeCombatEffectV054)
