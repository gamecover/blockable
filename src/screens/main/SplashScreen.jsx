import { useEffect } from 'react'
import { motion } from 'motion/react'
import { GameLogo } from '../../components/ui/GameLogo.jsx'

export function SplashScreen({ onReady }) {
  useEffect(() => { const id = setTimeout(onReady, 1300); return () => clearTimeout(id) }, [onReady])
  return <motion.main className="splash" initial={{ opacity: 0 }} animate={{ opacity: 1 }}><div className="ember">✦</div><GameLogo /><p>망치로 벼리고, 블록으로 정복하라.</p></motion.main>
}
