import { ScreenFrame } from '../../components/ui/ScreenFrame.jsx'
import { GoldAmount } from '../../components/ui/GoldAmount.jsx'
import { canEnterWorldDungeon } from '../../game/systems/worldMapSystem.js'
import globalMap from './assets/pictures/global_map.png'

export function WorldMapScreen({
  worldMap,
  health,
  maxHealth,
  gold,
  developerMode = false,
  developerDifficulty = 1,
  onDeveloperDifficultyChange,
  onPrepare,
  onSelect,
}) {
  const cleared = worldMap.dungeons.filter(({ kind, status }) =>
    kind === 'normal' && status === 'complete').length

  return (
    <ScreenFrame
      title="전체 지도"
      subtitle={`일반 던전 ${cleared}/${worldMap.requiredClearCount}`}
      actions={<div className="resource-bar map-resource-bar"><span>♥ {health}/{maxHealth}</span><GoldAmount amount={gold} /></div>}
    >
      {developerMode && (
        <div className="developer-global-tools">
          <label htmlFor="developer-difficulty">DEV · 전역 던전 난이도</label>
          <input
            id="developer-difficulty"
            type="range"
            min="1"
            max="10"
            step="1"
            value={developerDifficulty}
            onChange={(event) => onDeveloperDifficultyChange(event.target.value)}
          />
          <output htmlFor="developer-difficulty">{developerDifficulty}</output>
          <small>다음 던전 입장부터 적용</small>
        </div>
      )}
      <div className="world-map" style={{ backgroundImage: `url(${globalMap})` }}>
        {worldMap.dungeons.map((dungeon) => {
          const selectable = canEnterWorldDungeon(dungeon, developerMode)
          return (
            <button
              type="button"
              key={dungeon.id}
              className={`world-dungeon world-dungeon--${dungeon.kind} ${dungeon.status}`}
              style={{ left: `${dungeon.position.x}%`, top: `${dungeon.position.y}%` }}
              disabled={!selectable}
              onPointerEnter={() => { if (selectable) onPrepare?.(dungeon) }}
              onFocus={() => { if (selectable) onPrepare?.(dungeon) }}
              onClick={() => onSelect(dungeon)}
              aria-label={`${dungeon.name} · ${dungeon.status}`}
            >
              <b>{dungeon.kind === 'final' ? '♜' : '◆'}</b>
              <span>{dungeon.name}</span>
              <small>난이도 {dungeon.difficulty} · {dungeon.status === 'locked' ? '잠김' : dungeon.status === 'complete' ? '완료' : '입장'}</small>
            </button>
          )
        })}
      </div>
      <p className="map-hint">모든 던전에 즉시 입장할 수 있습니다. 완료한 던전은 지도에 기록됩니다.</p>
    </ScreenFrame>
  )
}
