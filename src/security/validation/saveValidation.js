export const isValidSave = (value) => {
  if (!value || typeof value !== 'object') return false
  const state = value.state ?? value
  return Boolean(state && Number.isFinite(state.health) && Number.isFinite(state.maxHealth)
    && Number.isFinite(state.gold) && Array.isArray(state.deck) && Array.isArray(state.map))
}
