import { createBlock } from '../../objects/blocks/blockData.js'
import { pick } from './randomSystem.js'

export const createBlockRewards = (count = 3, random = Math.random) =>
  Array.from({ length: count }, (_, index) => createBlock(pick(['I', 'O', 'L'], random), `reward-${index}`))

export const rollGoldReward = (random = Math.random) => 24 + Math.floor(random() * 17)
