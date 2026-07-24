export const isValidSave = (value) => {
  if (!value || typeof value !== 'object') return false
  const state = value.state ?? value
  const map = state?.map
  return Boolean(state && Number.isFinite(state.health) && Number.isFinite(state.maxHealth)
    && Number.isFinite(state.gold) && Array.isArray(state.deck)
    && map && typeof map === 'object' && Array.isArray(map.floors)
    && map.floors.every((floor) => Number.isInteger(floor.number) && Array.isArray(floor.steps)))
}
