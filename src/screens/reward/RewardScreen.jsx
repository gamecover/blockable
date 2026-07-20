import { motion } from 'motion/react'
import { ScreenFrame } from '../../components/ui/ScreenFrame.jsx'

export function RewardScreen({ rewards, gold, onChoose, onSkip }) {
  return (
    <ScreenFrame title="전리품을 선택하세요" subtitle="BATTLE WON">
      <div className="reward-summary"><span className="victory-mark">⚒</span><h3>승리!</h3><p>골드 <b>◆ {gold}</b>를 획득했습니다.</p></div>
      <div className="reward-grid">
        {rewards.map((block) => <motion.button whileHover={{ y: -8 }} className="block-card" key={block.id} onClick={() => onChoose(block)}><span className={`shape-icon shape-${block.shape}`}>{block.shape}</span><strong>{block.shape} 블록</strong><small>무색 · 공격 10</small><em>도구 주머니에 추가</em></motion.button>)}
      </div>
      <button className="text-button centered" onClick={onSkip}>보상을 건너뛴다</button>
    </ScreenFrame>
  )
}
