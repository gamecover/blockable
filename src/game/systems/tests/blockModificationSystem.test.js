import { describe, expect, it } from 'vitest'
import { createBlock } from '../../../objects/blocks/blockData.js'
import {
  changeBlockShape,
  infuseBlockColor,
  isModifiableStandardBlock,
} from '../blockModificationSystem.js'

describe('rest block modification', () => {
  it('changes a standard block color while preserving its shape and instance ID', () => {
    const block = createBlock('s002', 0)
    const modified = infuseBlockColor(block, 'fire')

    expect(modified).toMatchObject({
      id: block.id,
      definitionId: 'f002',
      color: 'fire',
      shape: 'L',
    })
  })

  it('changes a standard block shape while preserving its color and instance ID', () => {
    const block = createBlock('w001', 0)
    const modified = changeBlockShape(block, '003')

    expect(modified).toMatchObject({
      id: block.id,
      definitionId: 'w003',
      color: 'water',
      shape: 'O',
    })
  })

  it('does not allow special blocks to be modified', () => {
    const block = createBlock('a001', 0)

    expect(isModifiableStandardBlock(block)).toBe(false)
    expect(infuseBlockColor(block, 'fire')).toBe(block)
    expect(changeBlockShape(block, '003')).toBe(block)
  })
})
