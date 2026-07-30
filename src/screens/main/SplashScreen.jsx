import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { preloadGameAssets } from '../../managers/GameAssetPreloader.js'

export function SplashScreen({ onReady }) {
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    let active = true
    let exitTimer = null
    preloadGameAssets((value) => {
      if (active) setProgress(value)
    })
      .then(() => {
        if (!active) return
        setProgress(1)
        exitTimer = window.setTimeout(() => setExiting(true), 200)
      })
      .catch((reason) => {
        if (active) setError(reason instanceof Error ? reason.message : String(reason))
      })
    return () => {
      active = false
      if (exitTimer !== null) window.clearTimeout(exitTimer)
    }
  }, [onReady])

  const percent = Math.round(progress * 100)
  return <motion.main
    className={`splash${exiting ? ' splash--exiting' : ''}`}
    initial={{ opacity: 0 }}
    animate={{ opacity: exiting ? 0 : 1 }}
    transition={exiting
      ? { duration: 0.75, delay: 0.25, ease: 'easeInOut' }
      : { duration: 0.35 }}
    onAnimationComplete={() => { if (exiting) onReady() }}
  >
    <div className="ember">✦</div>
    <div className="splash__loading" role="status" aria-live="polite">
      <p>망치로 벼리고, 블록으로 정복하라.</p>
      {error
        ? <strong className="splash__error">로딩 실패: {error}</strong>
        : <>
          <div className="splash__track" aria-label="게임 리소스 로딩" aria-valuemin="0" aria-valuemax="100" aria-valuenow={percent} role="progressbar">
            <span style={{ width: `${percent}%` }} />
          </div>
          <small>불씨를 준비하는 중… {percent}%</small>
        </>}
    </div>
  </motion.main>
}
