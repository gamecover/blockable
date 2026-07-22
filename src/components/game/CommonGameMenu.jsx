import { useEffect, useState, useSyncExternalStore } from 'react'
import { MAX_FLOOR } from '../../game/constants/gameConfig.js'
import { GAME_EVENTS, gameBridge } from '../../game/events/gameEvents.js'
import { saveStatusStore } from '../../game/state/trackedStorage.js'
import { SoundManager } from '../../managers/SoundManager.js'
import './styles/common-game-menu.css'

const statusLabels = { saving: '저장 중', saved: '저장 완료', failed: '저장 실패' }

function IconButton({ label, icon, onClick }) {
  return (
    <button className="common-game-menu__button" type="button" onClick={onClick} aria-label={label} data-tooltip={label}>
      <span aria-hidden="true">{icon}</span>
    </button>
  )
}

function RunMapModal({ map, currentNodeId, onClose }) {
  return (
    <div className="common-modal__panel common-modal__panel--map" role="dialog" aria-modal="true" aria-labelledby="run-map-title">
      <header><div><small>현재 원정 경로</small><h2 id="run-map-title">지도</h2></div><button type="button" onClick={onClose} aria-label="지도 닫기">×</button></header>
      <div className="run-map" aria-label="읽기 전용 진행 지도">
        {map.map((nodes, index) => (
          <div className="run-map__floor" key={index}>
            <strong>{index + 1}F</strong>
            <div>{nodes.map((node) => <span className={`run-map__node ${node.status}${node.id === currentNodeId ? ' current' : ''}`} key={node.id}>{node.type === 'boss' ? '♜' : node.type === 'event' ? '?' : '⚔'}</span>)}</div>
          </div>
        ))}
      </div>
      <p className="common-modal__hint">현재 진행 상황을 확인하는 읽기 전용 지도입니다.</p>
    </div>
  )
}

function DeckModal({ deck, onClose }) {
  const blockCounts = deck.reduce((counts, block) => {
    const key = `${block.shape}-${block.color}`
    const current = counts.get(key)
    counts.set(key, current ? { ...current, count: current.count + 1 } : { ...block, count: 1 })
    return counts
  }, new Map())

  return (
    <div className="common-modal__panel common-modal__panel--deck" role="dialog" aria-modal="true" aria-labelledby="deck-title">
      <header><div><small>현재 원정 주머니</small><h2 id="deck-title">현재 덱 · {deck.length}개</h2></div><button type="button" onClick={onClose} aria-label="덱 닫기">×</button></header>
      <div className="run-deck" aria-label="현재 덱 구성">
        {[...blockCounts.values()].map((block) => (
          <div className={`run-deck__block ${block.color}`} key={`${block.shape}-${block.color}`}>
            <strong>{block.shape}</strong>
            <span>{block.color === 'neutral' ? '무색 블록' : `${block.color} 블록`}</span>
            <b aria-label={`${block.count}개`}>×{block.count}</b>
          </div>
        ))}
      </div>
      <p className="common-modal__hint">현재 원정에서 보유한 블록 구성입니다.</p>
    </div>
  )
}

function SettingsModal({ onClose, onRequestMainMenu }) {
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
      <button className="common-modal__action common-modal__action--danger" type="button" onClick={onRequestMainMenu}>메인 화면으로 이동</button>
    </div>
  )
}

function MainMenuConfirm({ onCancel, onConfirm }) {
  return (
    <div className="common-modal__panel common-modal__panel--confirm" role="alertdialog" aria-modal="true" aria-labelledby="main-confirm-title">
      <header><div><small>원정 중단</small><h2 id="main-confirm-title">메인 화면으로 이동할까요?</h2></div></header>
      <p>현재 런을 자동 저장한 뒤 메인 화면으로 이동합니다.</p>
      <div className="common-modal__actions"><button type="button" onClick={onCancel}>취소</button><button className="danger" type="button" onClick={onConfirm}>저장 후 이동</button></div>
    </div>
  )
}

export function CommonGameMenu({ floor, map, deck, currentNodeId, currentScreen, onMainMenu }) {
  const [modal, setModal] = useState(null)
  const saveStatus = useSyncExternalStore(saveStatusStore.subscribe, saveStatusStore.getSnapshot)

  useEffect(() => {
    gameBridge.emit(GAME_EVENTS.SET_INPUT_ENABLED, !modal)
    return () => gameBridge.emit(GAME_EVENTS.SET_INPUT_ENABLED, true)
  }, [modal])

  useEffect(() => {
    if (!modal) return undefined
    const closeOnEscape = (event) => { if (event.key === 'Escape') setModal(null) }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [modal])

  return (
    <>
      <aside className={`common-game-menu common-game-menu--${currentScreen}`} aria-label="공통 게임 메뉴">
        <strong className="common-game-menu__floor" aria-label={`현재 ${floor}층, 전체 ${MAX_FLOOR}층`}>{floor}/{MAX_FLOOR}F</strong>
        {currentScreen !== 'map' && <IconButton label="지도 확인" icon="⌘" onClick={() => setModal('map')} />}
        {currentScreen !== 'battle' && <IconButton label="현재 덱 확인" icon="▦" onClick={() => setModal('deck')} />}
        <IconButton label="설정 열기" icon="⚙" onClick={() => setModal('settings')} />
        <span className={`common-game-menu__save ${saveStatus}`} role="status">{statusLabels[saveStatus]}</span>
      </aside>
      {modal && <div className="common-modal" onMouseDown={(event) => { if (event.target === event.currentTarget && modal !== 'main') setModal(null) }}>
        {modal === 'map' && <RunMapModal map={map} currentNodeId={currentNodeId} onClose={() => setModal(null)} />}
        {modal === 'deck' && <DeckModal deck={deck} onClose={() => setModal(null)} />}
        {modal === 'settings' && <SettingsModal onClose={() => setModal(null)} onRequestMainMenu={() => setModal('main')} />}
        {modal === 'main' && <MainMenuConfirm onCancel={() => setModal(null)} onConfirm={onMainMenu} />}
      </div>}
    </>
  )
}
