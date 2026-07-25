import { motion } from 'motion/react'
import { ScreenFrame } from '../../components/ui/ScreenFrame.jsx'

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
            <span className={`shape-icon shape-${block.shape}`}>{block.shape}</span>
            <strong>{block.name}</strong>
            <small>강철 · 고유 블록</small>
            <em>도구 주머니에 추가</em>
          </motion.button>
        ))}
      </div>
    </ScreenFrame>
  )
}
