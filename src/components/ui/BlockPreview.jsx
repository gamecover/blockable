import fireTexture from '../../assets/sprites/blocks/block_fire.png'
import curseTexture from '../../assets/sprites/blocks/block_curse.png'
import legendTexture from '../../assets/sprites/blocks/block_legend.png'
import natureTexture from '../../assets/sprites/blocks/block_nature.png'
import specialTexture from '../../assets/sprites/blocks/block_special.png'
import steelTexture from '../../assets/sprites/blocks/block_steel.png'
import waterTexture from '../../assets/sprites/blocks/block_water.png'

const TEXTURES = {
  curse: curseTexture,
  fire: fireTexture,
  legendary: legendTexture,
  nature: natureTexture,
  special: specialTexture,
  steel: steelTexture,
  water: waterTexture,
}

export function BlockPreview({ block, compact = false }) {
  const cells = block.cells ?? []
  const minX = Math.min(...cells.map(([x]) => x))
  const maxX = Math.max(...cells.map(([x]) => x))
  const minY = Math.min(...cells.map(([, y]) => y))
  const maxY = Math.max(...cells.map(([, y]) => y))
  const texture = TEXTURES[block.color]

  return (
    <span
      className={`block-preview block-preview--${compact ? 'compact' : 'card'} block-preview--${block.color}${texture ? '' : ' block-preview--fallback'}`}
      style={{
        '--block-columns': maxX - minX + 1,
        '--block-rows': maxY - minY + 1,
      }}
      role="img"
      aria-label={`${block.name} 모양`}
    >
      {cells.map(([x, y], index) => (
        <span
          aria-hidden="true"
          className="block-preview__cell"
          key={`${x}-${y}-${index}`}
          style={{
            gridColumn: x - minX + 1,
            gridRow: y - minY + 1,
            ...(texture ? { backgroundImage: `url(${texture})` } : {}),
          }}
        />
      ))}
    </span>
  )
}
