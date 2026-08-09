import { useEffect, useState, useSyncExternalStore } from 'react'
import { BlueprintRecipe } from './BlueprintRecipe.jsx'
import dungeonMapIcon from '../../assets/pictures/ui/map_base_alpha.png'
import settingsIcon from '../../assets/pictures/ui/icons/Icon_Settings_a.png'
import blockPackIcon from '../../assets/pictures/ui/block_pack.png'
import blueprintIcon from '../../assets/pictures/ui/blueprint_icon.png'
import { MAX_FLOOR } from '../../game/constants/gameConfig.js'
import { GAME_EVENTS, gameBridge } from '../../game/events/gameEvents.js'
import { saveStatusStore } from '../../game/state/trackedStorage.js'
import { getMapNodePosition, isNodeWithinKnownProgress } from '../../game/systems/mapGenerationSystem.js'
import { getBlueprintCatalog } from '../../game/systems/blueprintSystem.js'
import globalMap from '../../screens/map/assets/pictures/maps_volcano.png'
import { GameSettingsModal } from './GameSettingsModal.jsx'
import { GoldAmount } from '../ui/GoldAmount.jsx'
import { BlockPreview } from '../ui/BlockPreview.jsx'
import mainBarLeft from '../../assets/pictures/ui/main_bar_left.png'
import mainBarMiddle from '../../assets/pictures/ui/main_bar_middle.png'
import mainBarRight from '../../assets/pictures/ui/main_bar_right.png'
import './styles/common-game-menu.css'

const statusLabels = { saving: '저장 중', saved: '저장 완료', failed: '저장 실패' }
const DECK_COLOR_ORDER = Object.freeze({ steel: 0, water: 1, nature: 2, fire: 3, special: 10, legendary: 11, curse: 12 })
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
  canOpenWorldMap,
  onClose,
  onOpenWorldMap,
}) {
  return (
    <div className="common-modal__panel common-modal__panel--map" role="dialog" aria-modal="true" aria-labelledby="run-map-title">
      <header><div><small>현재 원정 경로</small><h2 id="run-map-title">지도</h2></div><div className="common-modal__header-actions">{canOpenWorldMap && <button className="common-modal__world-map-button" type="button" onClick={onOpenWorldMap}>전체 지도</button>}<button type="button" onClick={onClose} aria-label="지도 닫기">×</button></div></header>
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
    const key = block.definitionId ?? `${block.shape}-${block.color}`
    const current = counts.get(key)
    counts.set(key, current ? { ...current, count: current.count + 1 } : { ...block, count: 1 })
    return counts
  }, new Map())
  const groupedBlocks = [...blockCounts.values()].sort((left, right) => {
    const colorOrder = (DECK_COLOR_ORDER[left.color] ?? 99) - (DECK_COLOR_ORDER[right.color] ?? 99)
    return colorOrder || left.name.localeCompare(right.name, 'ko')
  })

  return (
    <div className="common-modal__panel common-modal__panel--deck" role="dialog" aria-modal="true" aria-labelledby="deck-title">
      <header><div><small>현재 원정 주머니</small><h2 id="deck-title">현재 덱 · {deck.length}개</h2></div><button type="button" onClick={onClose} aria-label="덱 닫기">×</button></header>
      <div className="battle-pile-grid run-deck" aria-label="현재 덱 구성">
        {groupedBlocks.map((block) => (
          <div className="run-deck__block" key={block.definitionId ?? `${block.shape}-${block.color}`} aria-label={`${block.name} ×${block.count}`} title={block.name}>
            <BlockPreview block={block} compact />
            <b aria-label={`${block.count}개`}>×{block.count}</b>
          </div>
        ))}
      </div>
      <p className="common-modal__hint">현재 원정에서 보유한 블록 구성입니다.</p>
    </div>
  )
}

function BlueprintCatalogModal({ discoveredBlueprintIds, onClose }) {
  const discoveredIds = new Set(discoveredBlueprintIds)

  return (
    <div className="common-modal__panel common-modal__panel--blueprints" role="dialog" aria-modal="true" aria-labelledby="blueprint-catalog-title">
      <header><div><small>조합 도감</small><h2 id="blueprint-catalog-title">청사진</h2></div><button type="button" onClick={onClose} aria-label="청사진 닫기">×</button></header>
      <div className="blueprint-catalog" aria-label="청사진 목록">
        {getBlueprintCatalog().map((combination) => (
          <article className="blueprint-catalog__item" key={combination.id}>
            <BlueprintRecipe combination={combination} isDiscovered={discoveredIds.has(combination.id)} />
          </article>
        ))}
      </div>
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
  gold = 0,
  health = 0,
  discoveredBlueprintIds = [],
  title,
  leftPrimary,
  leftSecondary,
  showLeft = true,
  developerMode = false,
  onMainMenu,
}) {
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

  const resolvedLeftPrimary = leftPrimary ?? (currentScreen === 'worldMap' ? 'WORLD' : `FLOOR ${floor}`)
  const resolvedLeftSecondary = leftSecondary ?? (currentScreen === 'worldMap' ? 'DUNGEON MAP' : `${floor}/${MAX_FLOOR}F`)
  const resolvedTitle = title ?? {
    prologue: '프롤로그',
    worldMap: '전체 지도',
    map: map?.dungeonName ?? '던전 지도',
    startChoice: '원정 준비',
    reward: '전리품을 선택하세요',
    event: '인카운터',
    dungeonConquest: '던전 정복',
    gameover: '원정 실패',
    ending: '던전 정복',
    tutorial: '튜토리얼',
  }[currentScreen] ?? 'BLOCK-ABLE'

  const menu = (
    <aside className={`common-game-menu common-game-menu--${currentScreen}`} aria-label="공통 게임 메뉴">
      <section className="common-game-menu__panel common-game-menu__left" aria-label="진행 정보">
        <img className="common-game-menu__frame" src={mainBarLeft} alt="" aria-hidden="true" />
        {showLeft && <div className="common-game-menu__panel-content">
          <span>{resolvedLeftPrimary}</span>
          <strong>{resolvedLeftSecondary}</strong>
        </div>}
      </section>
      <section className="common-game-menu__panel common-game-menu__center" aria-label="현재 화면">
        <img className="common-game-menu__frame" src={mainBarMiddle} alt="" aria-hidden="true" />
        <div className="common-game-menu__panel-content"><strong>{resolvedTitle}</strong></div>
      </section>
      <section className="common-game-menu__panel common-game-menu__right" aria-label="게임 메뉴">
        <img className="common-game-menu__frame" src={mainBarRight} alt="" aria-hidden="true" />
        <div className="common-game-menu__panel-content">
          <div className="common-game-menu__info">
            <span className="common-game-menu__health">HP : {health}</span>
            <span className="common-game-menu__gold"><GoldAmount amount={gold} /><span className="common-game-menu__gold-label">Gold</span></span>
          </div>
          <div className="common-game-menu__actions">
            <IconButton label="던전 지도" imageSrc={dungeonMapIcon} onClick={() => setModal('map')} />
            <IconButton label="소지 블록 확인" imageSrc={blockPackIcon} onClick={() => setModal('deck')} />
            <IconButton label="청사진" imageSrc={blueprintIcon} onClick={() => setModal('blueprints')} />
            <IconButton label="설정 열기" imageSrc={settingsIcon} onClick={() => setModal('settings')} />
          </div>
        </div>
        <span className={`common-game-menu__save ${saveStatus}`} role="status">{statusLabels[saveStatus]}</span>
      </section>
    </aside>
  )

  return (
    <>
      {menu}
      {modal && <div className={`common-modal${modal === 'settings' ? ' common-modal--settings' : ''}`} onMouseDown={(event) => { if (event.target === event.currentTarget && modal !== 'main') setModal(null) }}>
        {modal === 'map' && <RunMapModal map={map} floor={floor} currentNodeId={currentNodeId} concealFuture={currentScreen === 'battle'} canOpenWorldMap={currentScreen !== 'map' || developerMode} onClose={() => setModal(null)} onOpenWorldMap={() => setModal('worldMap')} />}
        {modal === 'worldMap' && <WorldMapModal worldMap={worldMap} activeDungeonId={activeDungeonId} onClose={() => setModal(null)} />}
        {modal === 'deck' && <DeckModal deck={deck} onClose={() => setModal(null)} />}
        {modal === 'blueprints' && <BlueprintCatalogModal discoveredBlueprintIds={discoveredBlueprintIds} onClose={() => setModal(null)} />}
        {modal === 'settings' && <GameSettingsModal onClose={() => setModal(null)} onRequestMainMenu={() => setModal('main')} />}
        {modal === 'main' && <MainMenuConfirm onCancel={() => setModal(null)} onConfirm={onMainMenu} />}
      </div>}
    </>
  )
}
