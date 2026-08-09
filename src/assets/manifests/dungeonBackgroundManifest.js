import ashenFurnaceBackground from '../pictures/backgrounds/Ash_furance_alpha.png'
import centralFurnaceBackground from '../pictures/backgrounds/central_furance.png'
import floodedFoundryBackground from '../pictures/backgrounds/flooded_foundry_alpha.png'

export { centralFurnaceBackground }

export const getDungeonBackground = (dungeonId) => {
  if (dungeonId === 'ashen-forge-west') return floodedFoundryBackground
  if (dungeonId === 'great-forge') return centralFurnaceBackground
  return ashenFurnaceBackground
}
