import { motion } from 'motion/react'
import { ScreenFrame } from '../../components/ui/ScreenFrame.jsx'
import { BlockPreview } from '../../components/ui/BlockPreview.jsx'

export function StartBlockChoiceScreen({ dungeonName, floor, choices, onChoose }) {
  return (
    <ScreenFrame title={dungeonName} subtitle={`${floor}층`} barVariant="dungeon">
      <div className="reward-summary">
        <span className="victory-mark">◆</span>
        <h3>고유 블록을 선택하세요</h3>
        <p>선택한 블록 하나가 시작 도구 주머니에 추가됩니다.</p>
      </div>
      <div className="reward-grid">
        {choices.map((block) => (
          <motion.button
            type="button"
            whileHover={{ y: -8 }}
            className="block-card"
            key={block.id}
            onClick={() => onChoose(block)}
          >
            <BlockPreview block={block} />
            <strong>{block.name}</strong>
            <small>{block.description}</small>
            <em>도구 주머니에 추가</em>
          </motion.button>
        ))}
      </div>
    </ScreenFrame>
  )
}
