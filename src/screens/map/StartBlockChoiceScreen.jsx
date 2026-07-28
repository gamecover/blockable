import { motion } from 'motion/react'
import { ScreenFrame } from '../../components/ui/ScreenFrame.jsx'
import { BlockChoiceDetails } from '../../components/ui/BlockChoiceDetails.jsx'

export function StartBlockChoiceScreen({ choices, onChoose }) {
  return (
    <ScreenFrame title="원정 준비" subtitle="새 게임">
      <div className="reward-summary">
        <span className="victory-mark">◆</span>
        <h3>고유 블록을 선택하세요</h3>
        <p>무작위로 제안된 세 종류 중 하나를 선택하세요. 이 선택은 현재 게임 전체에서 유지됩니다.</p>
      </div>
      <div className="reward-grid">
        {choices.map((block) => (
          <motion.button
            type="button"
            whileHover={{ y: -8 }}
            className="block-card"
            key={block.id}
            onClick={() => onChoose(block)}
            aria-label={`${block.name} 선택`}
          >
            <BlockChoiceDetails block={block} />
            <em>도구 주머니에 추가</em>
          </motion.button>
        ))}
      </div>
    </ScreenFrame>
  )
}
