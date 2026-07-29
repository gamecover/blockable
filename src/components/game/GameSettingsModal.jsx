import { useCallback, useEffect, useRef, useState } from 'react'
import backgroundSoundLabel from '../../assets/pictures/ui/settings/background_sound_alpha.png'
import effectSoundLabel from '../../assets/pictures/ui/settings/effect_sound_alpha.png'
import fullscreenButton from '../../assets/pictures/ui/settings/full_screen_alpha.png'
import settingsPanel from '../../assets/pictures/ui/settings/settings_alpha_font.png'
import { SoundManager } from '../../managers/SoundManager.js'
import './styles/common-game-menu.css'

function AssetVolumeControl({ label, labelImage, value, onValueChange }) {
  const percentage = Math.round(value * 100)
  const updateFromPointer = (event) => {
    const track = event.currentTarget.parentElement
    const bounds = track.getBoundingClientRect()
    const innerLeft = bounds.left + bounds.width * 0.016
    const innerWidth = bounds.width * 0.968
    const nextValue = Math.min(1, Math.max(0, (event.clientX - innerLeft) / innerWidth))
    event.currentTarget.value = String(nextValue)
    onValueChange(nextValue)
  }
  return (
    <label className="settings-asset-volume">
      <span className="settings-asset-volume__heading">
        <img src={labelImage} alt={label} />
        <output aria-label={`${label} 음량`}>{percentage}%</output>
      </span>
      <span className="settings-asset-volume__track" style={{ '--settings-volume': value }}>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          defaultValue={value}
          aria-label={`${label} 음량`}
          onInput={(event) => onValueChange(Number(event.currentTarget.value))}
          onPointerDown={(event) => {
            event.preventDefault()
            event.currentTarget.setPointerCapture(event.pointerId)
            updateFromPointer(event)
          }}
          onPointerMove={(event) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
              updateFromPointer(event)
            }
          }}
          onPointerUp={(event) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
              event.currentTarget.releasePointerCapture(event.pointerId)
            }
          }}
          onPointerCancel={(event) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
              event.currentTarget.releasePointerCapture(event.pointerId)
            }
          }}
        />
      </span>
    </label>
  )
}

export function GameSettingsModal({ onClose, onRequestMainMenu }) {
  const [sfxVolume, setSfxVolume] = useState(() => SoundManager.getSfxVolume())
  const [musicVolume, setMusicVolume] = useState(() => SoundManager.getMusicVolume())
  const [isFullscreen, setIsFullscreen] = useState(() => Boolean(document.fullscreenElement))
  const volumeFrame = useRef(null)

  const updateVolume = useCallback((setter, soundSetter, value) => {
    if (volumeFrame.current) cancelAnimationFrame(volumeFrame.current)
    volumeFrame.current = requestAnimationFrame(() => {
      setter(value)
      soundSetter(value)
      volumeFrame.current = null
    })
  }, [])

  useEffect(() => {
    const updateFullscreen = () => setIsFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', updateFullscreen)
    return () => document.removeEventListener('fullscreenchange', updateFullscreen)
  }, [])

  useEffect(() => () => {
    if (volumeFrame.current) cancelAnimationFrame(volumeFrame.current)
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
    <div
      className="common-modal__panel settings-asset-panel"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
      style={{ '--settings-panel-image': `url(${settingsPanel})` }}
    >
      <h2 className="visually-hidden" id="settings-title">환경설정</h2>
      <button className="settings-asset-panel__close" type="button" onClick={onClose} aria-label="환경설정 닫기">×</button>
      <div className="settings-asset-panel__content">
        <AssetVolumeControl
          label="배경음"
          labelImage={backgroundSoundLabel}
          value={musicVolume}
          onValueChange={(value) => {
            updateVolume(setMusicVolume, (nextValue) => SoundManager.setMusicVolume(nextValue), value)
          }}
        />
        <AssetVolumeControl
          label="효과음"
          labelImage={effectSoundLabel}
          value={sfxVolume}
          onValueChange={(value) => {
            updateVolume(setSfxVolume, (nextValue) => SoundManager.setSfxVolume(nextValue), value)
          }}
        />
        <button className="settings-asset-fullscreen" type="button" onClick={toggleFullscreen}>
          <img src={fullscreenButton} alt="" />
          <span className="visually-hidden">{isFullscreen ? '전체 화면 종료' : '전체 화면 전환'}</span>
        </button>
        {onRequestMainMenu && <button className="settings-asset-main-menu" type="button" onClick={onRequestMainMenu}>메인 화면으로 이동</button>}
      </div>
    </div>
  )
}
