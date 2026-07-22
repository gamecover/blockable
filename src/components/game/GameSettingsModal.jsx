import { useEffect, useState } from 'react'
import { SoundManager } from '../../managers/SoundManager.js'
import './styles/common-game-menu.css'

export function GameSettingsModal({ onClose, onRequestMainMenu }) {
  const [sfxVolume, setSfxVolume] = useState(() => SoundManager.getSfxVolume())
  const [musicVolume, setMusicVolume] = useState(() => SoundManager.getMusicVolume())
  const [isFullscreen, setIsFullscreen] = useState(() => Boolean(document.fullscreenElement))

  useEffect(() => {
    const updateFullscreen = () => setIsFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', updateFullscreen)
    return () => document.removeEventListener('fullscreenchange', updateFullscreen)
  }, [])

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else await document.documentElement.requestFullscreen()
    } catch {
      setIsFullscreen(Boolean(document.fullscreenElement))
    }
  }

  return (
    <div className="common-modal__panel" role="dialog" aria-modal="true" aria-labelledby="settings-title">
      <header><div><small>게임 환경</small><h2 id="settings-title">설정</h2></div><button type="button" onClick={onClose} aria-label="설정 닫기">×</button></header>
      <label className="volume-control"><span>배경음</span><output>{Math.round(musicVolume * 100)}%</output><input type="range" min="0" max="1" step="0.05" value={musicVolume} onChange={(event) => { const value = Number(event.target.value); setMusicVolume(value); SoundManager.setMusicVolume(value) }} /></label>
      <label className="volume-control"><span>효과음</span><output>{Math.round(sfxVolume * 100)}%</output><input type="range" min="0" max="1" step="0.05" value={sfxVolume} onChange={(event) => { const value = Number(event.target.value); setSfxVolume(value); SoundManager.setSfxVolume(value) }} /></label>
      <button className="common-modal__action" type="button" onClick={toggleFullscreen}>{isFullscreen ? '전체 화면 종료' : '전체 화면 전환'}</button>
      {onRequestMainMenu && <button className="common-modal__action common-modal__action--danger" type="button" onClick={onRequestMainMenu}>메인 화면으로 이동</button>}
    </div>
  )
}
