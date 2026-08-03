const SYNERGY_COLORS = ['fire', 'water', 'nature']

const COLOR_LABELS = {
  fire: '화염의',
  water: '물의',
  nature: '자연의',
}

export const countPlacedSynergyColors = (placedBlocks = []) => {
  const counts = { fire: 0, water: 0, nature: 0 }
  placedBlocks.forEach(({ block }) => {
    if (SYNERGY_COLORS.includes(block?.color)) counts[block.color] += 1
  })
  return counts
}

export const resolveColorSynergy = (placedBlocks = []) => {
  const counts = countPlacedSynergyColors(placedBlocks)
  const { fire, water, nature } = counts
  const activeColorCount = SYNERGY_COLORS.filter((color) => counts[color] > 0).length
  const mixed = activeColorCount === 2
  const disabledByThreeColors = activeColorCount === 3
  const fireAndWater = mixed && fire > 0 && water > 0
  const fireAndNature = mixed && fire > 0 && nature > 0
  const mixedIndependentDamage = (fireAndWater ? 5 : 0) + (fireAndNature ? 5 : 0)

  return {
    counts,
    mixed,
    disabledByThreeColors,
    labels: disabledByThreeColors ? [] : [
      ...(mixed ? [{ color: null, text: '뒤섞인' }] : []),
      ...SYNERGY_COLORS
        .filter((color) => counts[color] > 0)
        .map((color) => ({ color, text: `${COLOR_LABELS[color]}(x${counts[color]})` })),
    ],
    independentDamage: disabledByThreeColors
      ? 0
      : mixed
        ? mixedIndependentDamage
        : (fire >= 1 ? 10 : 0) + (fire >= 3 ? 20 : 0),
    independentRange: !disabledByThreeColors && !mixed && fire >= 2 ? 'all' : 'single',
    hitCountModifier: disabledByThreeColors || mixed
      ? 0
      : (fire >= 4 ? 1 : 0) + (fire >= 5 ? 1 : 0),
    armor: (disabledByThreeColors
      ? 0
      : mixed ? 0 : (water >= 1 ? 10 : 0) + (water >= 2 ? 20 : 0))
      + (fireAndWater ? 5 : 0),
    armorMultiplier: !disabledByThreeColors && !mixed && water >= 4 ? 2 : 1,
    retainArmorNextTurn: !disabledByThreeColors && !mixed && water >= 3,
    addArmorToIndependentDamage: !disabledByThreeColors && !mixed && water >= 5,
    healing: (disabledByThreeColors
      ? 0
      : mixed
      ? 0
      : (nature >= 1 ? 2 : 0)
        + (nature >= 2 ? 3 : 0)
        + (nature >= 3 ? 5 : 0)
        + (nature >= 4 ? 8 : 0)
        + (nature >= 5 ? 12 : 0))
      + (fireAndNature ? 1 : 0),
  }
}
