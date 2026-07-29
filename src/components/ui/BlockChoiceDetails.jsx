import { describeBlockEffect } from '../../game/systems/blockEffectSystem.js'
import { BlockPreview } from './BlockPreview.jsx'

const ATTRIBUTE_LABELS = {
  water: '물',
  nature: '자연',
  steel: '강철',
  fire: '불',
  legendary: '전설',
  legend: '전설',
  special: '고유',
  curse: '저주',
}

export function BlockChoiceDetails({ block }) {
  const effects = (block.effects ?? []).map(describeBlockEffect).filter(Boolean)
  return (
    <>
      <BlockPreview block={block} />
      <strong>{ATTRIBUTE_LABELS[block.color] ?? block.color}</strong>
      <small>{effects.join(' · ')}</small>
    </>
  )
}
