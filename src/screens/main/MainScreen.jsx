import { useEffect, useState } from 'react'
import { GameSettingsModal } from '../../components/game/GameSettingsModal.jsx'
import { GAME_VERSION } from '../../game/constants/version.js'
import './styles/main-screen.css'

export function MainScreen({
  onStart,
  onContinue,
  canContinue,
  onTutorial,
  developerToolsEnabled = false,
  onDeveloperStart,
  onDeveloperContinue,
  canDeveloperContinue = false,
}) {
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
          <button className="main-menu-button" type="button" onClick={onContinue} disabled={!canContinue}>
            <span>이어하기</span>
          </button>
          <button className="main-menu-button" type="button" onClick={onStart}>
            <span>새 게임</span>
          </button>
          <button className="main-menu-button" type="button" onClick={onTutorial}>
            <span>튜토리얼</span>
          </button>
          <button className="main-menu-button" type="button" onClick={() => setSettingsOpen(true)}>
            <span>설정</span>
          </button>
        </nav>
        {developerToolsEnabled && (
          <aside className="developer-main-menu" aria-label="개발자 모드 메뉴">
            <strong>DEV MODE</strong>
            <button type="button" onClick={onDeveloperStart}>개발자 게임 시작</button>
            <button type="button" onClick={onDeveloperContinue} disabled={!canDeveloperContinue}>개발자 이어하기</button>
          </aside>
        )}
        <small className="main-screen__version">v{GAME_VERSION}</small>
      </main>
      {settingsOpen && <div className="common-modal common-modal--settings" onMouseDown={(event) => { if (event.target === event.currentTarget) setSettingsOpen(false) }}><GameSettingsModal onClose={() => setSettingsOpen(false)} /></div>}
    </>
  )
}
