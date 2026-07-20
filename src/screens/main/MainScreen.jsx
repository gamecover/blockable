import { motion } from 'motion/react'
import { GameLogo } from '../../components/ui/GameLogo.jsx'

export function MainScreen({ onStart, onContinue, canContinue }) {
  return (
    <main className="main-screen">
      <motion.div className="hero-panel" initial={{ y: 18, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
        <GameLogo />
        <p className="tagline">세계 제일의 대장장이, 이번엔 직접 던전으로.</p>
        <div className="menu-actions">
          <button className="primary-button" onClick={onStart}>새로운 원정</button>
          {canContinue && <button className="secondary-button" onClick={onContinue}>계속하기</button>}
        </div>
        <span className="build-mark">PROTOTYPE BUILD 0.1</span>
      </motion.div>
      <div className="forge-art" aria-hidden="true"><span>⚒</span><div className="anvil">▰</div></div>
    </main>
  )
}
