import { useEffect, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import deckIcon from '../../assets/pictures/ui/icons/icon_blueprints_alpha.png'
import dungeonMapIcon from '../../assets/pictures/ui/map_base_alpha.png'
import settingsIcon from '../../assets/pictures/ui/icons/Icon_Settings_a.png'
import { MAX_FLOOR } from '../../game/constants/gameConfig.js'
import { GAME_EVENTS, gameBridge } from '../../game/events/gameEvents.js'
import { saveStatusStore } from '../../game/state/trackedStorage.js'
import { getMapNodePosition, isNodeWithinKnownProgress } from '../../game/systems/mapGenerationSystem.js'
import globalMap from '../../screens/map/assets/pictures/maps_volcano.png'
import { GameSettingsModal } from './GameSettingsModal.jsx'
import './styles/common-game-menu.css'

const statusLabels = { saving: '저장 중', saved: '저장 완료', failed: '저장 실패' }
const mapSymbols = {
  unique_block_selection: '◆',
  floor_start: '●',
  battle: '⚔',
  elite: '☠',
  event: '?',
  rest: '♥',
  stairs: '⇧',
  boss: '♜',
  hidden: '·',
}

function IconButton({ label, icon, imageSrc, onClick }) {
  return (
    <button className="common-game-menu__button" type="button" onClick={onClick} aria-label={label} data-tooltip={label}>
      {imageSrc
        ? <img className="common-game-menu__button-image" src={imageSrc} alt="" />
        : <span aria-hidden="true">{icon}</span>}
    </button>
  )
}

function RunMapModal({
  map,
  floor: currentFloor,
  currentNodeId,
  concealFuture,
  onClose,
  onOpenWorldMap,
}) {
  return (
    <div className="common-modal__panel common-modal__panel--map" role="dialog" aria-modal="true" aria-labelledby="run-map-title">
      <header><div><small>현재 원정 경로</small><h2 id="run-map-title">지도</h2></div><div className="common-modal__header-actions"><button className="common-modal__world-map-button" type="button" onClick={onOpenWorldMap}>전체 지도</button><button type="button" onClick={onClose} aria-label="지도 닫기">×</button></div></header>
      <div className="run-map-list" aria-label="읽기 전용 진행 지도">
        {map.floors.map((floor) => (
          <section className="run-map-section" key={floor.number}>
            <strong>{floor.number}층</strong>
            {concealFuture && floor.number > currentFloor
              ? <p className="common-modal__hint">아직 확인할 수 없는 구역입니다.</p>
              : <div className="run-map run-map--rooms">
                <svg viewBox="0 0 1000 400" preserveAspectRatio="none" aria-hidden="true">
                  {floor.corridors.map((corridor) => {
                    const from = floor.nodes.find(({ id }) => id === corridor.from)
                    const to = floor.nodes.find(({ id }) => id === corridor.to)
                    const start = getMapNodePosition(map, from)
                    const end = getMapNodePosition(map, to)
                    return <line key={corridor.id} x1={start.x * 10} y1={start.y * 4} x2={end.x * 10} y2={end.y * 4} />
                  })}
                </svg>
                {floor.nodes.map((node) => {
                  const position = getMapNodePosition(map, node)
                  const revealed = !concealFuture || isNodeWithinKnownProgress(node)
                  return (
                    <span
                      className={`run-map__node ${node.status}${node.id === currentNodeId ? ' current' : ''}`}
                      style={{ left: `${position.x}%`, top: `${position.y}%` }}
                      key={node.id}
                    >{mapSymbols[revealed ? node.type : 'hidden']}</span>
                  )
                })}
              </div>}
          </section>
        ))}
      </div>
      <p className="common-modal__hint">현재 진행 상황을 확인하는 읽기 전용 지도입니다.</p>
    </div>
  )
}

function WorldMapModal({ worldMap, activeDungeonId, onClose }) {
  return (
    <div className="common-modal__panel common-modal__panel--world-map" role="dialog" aria-modal="true" aria-labelledby="world-map-title">
      <header><div><small>현재 원정의 전체 위치</small><h2 id="world-map-title">전체 지도</h2></div><button type="button" onClick={onClose} aria-label="전체 지도 닫기">×</button></header>
      <div className="world-map common-world-map" style={{ backgroundImage: `url(${globalMap})` }} aria-label="읽기 전용 전체 지도">
        {worldMap.dungeons.map((dungeon) => (
          <div
            className={`world-dungeon world-dungeon--${dungeon.kind} world-dungeon--${dungeon.id} ${dungeon.status}${dungeon.id === activeDungeonId ? ' current' : ''}`}
            style={{ left: `${dungeon.position.x}%`, top: `${dungeon.position.y}%` }}
            key={dungeon.id}
          >
            <b aria-hidden="true">{dungeon.kind === 'final' ? '♜' : '◆'}</b>
            <span>{dungeon.name}</span>
            <small>{dungeon.id === activeDungeonId ? '현재 위치' : dungeon.status === 'complete' ? '완료' : '입장 가능'}</small>
          </div>
        ))}
      </div>
      <p className="common-modal__hint">던전 안에서는 전체 지도를 확인할 수만 있으며 다른 던전으로 이동할 수 없습니다.</p>
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

function MainMenuConfirm({ onCancel, onConfirm }) {
  return (
    <div className="common-modal__panel common-modal__panel--confirm" role="alertdialog" aria-modal="true" aria-labelledby="main-confirm-title">
      <header><div><small>원정 중단</small><h2 id="main-confirm-title">메인 화면으로 이동할까요?</h2></div></header>
      <p>현재 런을 자동 저장한 뒤 메인 화면으로 이동합니다.</p>
      <div className="common-modal__actions"><button type="button" onClick={onCancel}>취소</button><button className="danger" type="button" onClick={onConfirm}>저장 후 이동</button></div>
    </div>
  )
}

export function CommonGameMenu({
  floor,
  map,
  worldMap,
  deck,
  activeDungeonId,
  currentNodeId,
  currentScreen,
  onMainMenu,
}) {
  const [modal, setModal] = useState(null)
  const [battleHudTarget, setBattleHudTarget] = useState(null)
  const saveStatus = useSyncExternalStore(saveStatusStore.subscribe, saveStatusStore.getSnapshot)

  useEffect(() => {
    setBattleHudTarget(currentScreen === 'battle'
      ? document.querySelector('.battle-hud__menu-slot')
      : null)
  }, [currentScreen])

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

  const menu = (
    <aside className={`common-game-menu common-game-menu--${currentScreen}`} aria-label="공통 게임 메뉴">
      {currentScreen !== 'battle' && <strong className="common-game-menu__floor" aria-label={currentScreen === 'worldMap' ? '전체 지도' : `현재 ${floor}층, 전체 ${MAX_FLOOR}층`}>{currentScreen === 'worldMap' ? 'WORLD' : `${floor}/${MAX_FLOOR}F`}</strong>}
        <IconButton label="던전 지도" imageSrc={dungeonMapIcon} onClick={() => setModal('map')} />
        <IconButton label="현재 덱 확인" imageSrc={deckIcon} onClick={() => setModal('deck')} />
        <IconButton label="설정 열기" imageSrc={settingsIcon} onClick={() => setModal('settings')} />
        <span className={`common-game-menu__save ${saveStatus}`} role="status">{statusLabels[saveStatus]}</span>
    </aside>
  )

  return (
    <>
      {currentScreen === 'battle' && battleHudTarget
        ? createPortal(menu, battleHudTarget)
        : menu}
      {modal && <div className={`common-modal${modal === 'settings' ? ' common-modal--settings' : ''}`} onMouseDown={(event) => { if (event.target === event.currentTarget && modal !== 'main') setModal(null) }}>
        {modal === 'map' && <RunMapModal map={map} floor={floor} currentNodeId={currentNodeId} concealFuture={currentScreen === 'battle'} onClose={() => setModal(null)} onOpenWorldMap={() => setModal('worldMap')} />}
        {modal === 'worldMap' && <WorldMapModal worldMap={worldMap} activeDungeonId={activeDungeonId} onClose={() => setModal(null)} />}
        {modal === 'deck' && <DeckModal deck={deck} onClose={() => setModal(null)} />}
        {modal === 'settings' && <GameSettingsModal onClose={() => setModal(null)} onRequestMainMenu={() => setModal('main')} />}
        {modal === 'main' && <MainMenuConfirm onCancel={() => setModal(null)} onConfirm={onMainMenu} />}
      </div>}
    </>
  )
}
