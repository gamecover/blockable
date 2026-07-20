import { motion } from 'motion/react'

export function PrologueScreen({ onContinue }) {
  return (
    <main className="prologue-screen">
      <motion.div className="story-card" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="story-art"><span>⚒</span><div className="mountains">▲ ▲ ▲</div></div>
        <article><span className="eyebrow">PROLOGUE</span><h2>마침내, 대장장이가 나선다.</h2><p>당신이 만든 무기를 든 용사들은 번번이 패퇴했다. 세계 제일의 대장장이인 당신은 더는 기다리지 않기로 했다.</p><p>도구 주머니를 둘러메고, 살아 움직이는 던전의 문을 연다.</p><button className="primary-button" onClick={onContinue}>도구 주머니를 챙긴다 →</button></article>
      </motion.div>
    </main>
  )
}
