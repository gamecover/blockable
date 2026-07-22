import { useEffect, useState } from 'react'
import { GameSettingsModal } from '../../components/game/GameSettingsModal.jsx'
import { MainMenuButton } from './components/MainMenuButton.jsx'
import configButton from './assets/buttons/button_config_01.png'
import startButton from './assets/buttons/button_start_01.png'
import continueButton from './assets/buttons/continue_01.png'
import './styles/main-screen.css'

export function MainScreen({ onStart, onContinue, canContinue }) {
  const [settingsOpen, setSettingsOpen] = useState(false)

  useEffect(() => {
    if (!settingsOpen) return undefined
    const closeOnEscape = (event) => { if (event.key === 'Escape') setSettingsOpen(false) }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [settingsOpen])

  return (
    <>
      <main className="main-screen" aria-label="BLOCK-ABLE 메인 메뉴">
        <div className="main-screen__shade" aria-hidden="true" />
        <nav className="main-menu" aria-label="게임 메뉴">
          <MainMenuButton imageSrc={startButton} onClick={onStart} delay={0}>새 게임 시작</MainMenuButton>
          <MainMenuButton imageSrc={continueButton} onClick={onContinue} disabled={!canContinue} delay={0.08}>이어하기</MainMenuButton>
          <MainMenuButton imageSrc={configButton} onClick={() => setSettingsOpen(true)} delay={0.16}>환경 설정</MainMenuButton>
        </nav>
      </main>
      {settingsOpen && <div className="common-modal" onMouseDown={(event) => { if (event.target === event.currentTarget) setSettingsOpen(false) }}><GameSettingsModal onClose={() => setSettingsOpen(false)} /></div>}
    </>
  )
}
