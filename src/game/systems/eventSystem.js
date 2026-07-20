export const rollGoldChest = (random = Math.random) => {
  const doubled = random() < 0.05
  return { type: 'gold', gold: doubled ? 300 : 150, doubled }
}
