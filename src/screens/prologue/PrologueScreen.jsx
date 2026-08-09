import { motion } from 'motion/react'
import { centralFurnaceBackground } from '../../assets/manifests/dungeonBackgroundManifest.js'
import { EventLayout } from '../event/components/EventLayout.jsx'
import openingImage from './assets/pictures/opening.png'

export function PrologueScreen({ onContinue }) {
  return (
    <main
      className="prologue-screen"
      style={{ '--prologue-background-image': `url("${centralFurnaceBackground}")` }}
    >
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <EventLayout title="마침내, 대장장이가 나선다." illustration={openingImage}>
          <span className="eyebrow">PROLOGUE</span>
          <p>당신이 만든 무기를 든 용사들은 번번이 패퇴했다. 세계 제일의 대장장이인 당신은 더는 기다리지 않기로 했다.</p>
          <p>도구 주머니를 둘러메고, 살아 움직이는 던전의 문을 연다.</p>
          <button className="primary-button" onClick={onContinue}>불록 주머니를 챙긴다</button>
        </EventLayout>
      </motion.div>
    </main>
  )
}
