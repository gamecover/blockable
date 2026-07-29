import { motion } from 'motion/react'
import { GoldAmount } from '../../components/ui/GoldAmount.jsx'
import { ScreenFrame } from '../../components/ui/ScreenFrame.jsx'
import {
  canTravelToNode,
  getFloor,
  getMapEdges,
  getMapNodePosition,
  getMapNodes,
} from '../../game/systems/mapGenerationSystem.js'
import mapArrowCurveUp from './assets/pictures/map_arrow_01.png'
import mapArrowLong from './assets/pictures/map_arrow_02.png'
import mapArrowCurveDown from './assets/pictures/map_arrow_03.png'
import mapArrowShort from './assets/pictures/map_arrow_short_01.png'
import mapArrowShortCurve from './assets/pictures/map_arrow_short_02.png'
import mapBase from './assets/pictures/map_base_alpha.png'

const symbols = {
  unique_block_selection: '◆',
  floor_start: '●',
  battle: '⚔',
  elite: '☠',
  event: '?',
  rest: '♥',
  stairs: '⇧',
  boss: '♜',
}

const labels = {
  unique_block_selection: '고유 블록',
  floor_start: '층 시작',
  battle: '전투',
  elite: '강적',
  event: '사건',
  rest: '휴식',
  stairs: '계단',
  boss: '보스',
}

const getCorridorArrow = ({ corridor, start, end }) => {
  const startX = start.x * 10
  const startY = start.y * 6
  const endX = end.x * 10
  const endY = end.y * 6
  const deltaX = endX - startX
  const deltaY = endY - startY
  const distance = Math.hypot(deltaX, deltaY)
  const isShort = distance < 255
  const image = isShort
    ? Math.abs(deltaY) > 45 ? mapArrowShortCurve : mapArrowShort
    : corridor.pathRole === 'risk'
      ? mapArrowCurveDown
      : Math.abs(deltaY) > 80 ? mapArrowCurveUp : mapArrowLong
  const renderedDistance = distance * 0.72
  const height = isShort ? 50 : 61
  const centerX = (startX + endX) / 2
  const centerY = (startY + endY) / 2
  return {
    image,
    x: centerX - renderedDistance / 2,
    y: centerY - height / 2,
    width: renderedDistance,
    height,
    angle: Math.atan2(deltaY, deltaX) * 180 / Math.PI,
    centerX,
    centerY,
  }
}

export function MapScreen({
  map,
  floor,
  currentNodeId,
  health,
  maxHealth,
  gold,
  developerMode = false,
  onDebugAddGold,
  onDebugAddHealth,
  onLeaveDungeon,
  onSelect,
}) {
  const selectedFloor = getFloor(map, floor)
  const nodes = getMapNodes(map, floor)
  const positions = new Map(nodes.map((node) => [node.id, getMapNodePosition(map, node)]))
  const corridors = getMapEdges(map, floor)

  return (
    <ScreenFrame title={map.dungeonName} subtitle={`${floor}층 · 난이도 ${map.difficulty}`} barVariant="dungeon" actions={<div className="resource-bar map-resource-bar"><span>♥ {health}/{maxHealth}</span><GoldAmount amount={gold} /></div>}>
      <div className="map-toolbar">
        <div className="map-legend">
          <span><i className="dot available" /> 이동 가능</span>
          <span><i className="dot complete" /> 완료</span>
          <span><i className="dot risk" /> 위험 가지</span>
        </div>
        <button type="button" className="text-button map-exit-button" onClick={onLeaveDungeon}>전체 지도</button>
        {developerMode && (
          <div className="developer-map-tools">
            <strong>DEV · seed {map.seed} · {map.generatorVersion}</strong>
            <div>
              <button type="button" onClick={onDebugAddGold}>골드 +1000</button>
              <button type="button" onClick={onDebugAddHealth}>현재/최대 체력 +25</button>
            </div>
          </div>
        )}
      </div>
      <div className="dungeon-map-viewport">
        <div
          className="dungeon-map dungeon-map--rooms"
          style={{ backgroundImage: `url(${mapBase})` }}
          aria-label={`${map.dungeonName} ${floor}층 방 지도`}
        >
          <svg className="room-corridors" viewBox="0 0 1000 600" preserveAspectRatio="none" aria-hidden="true">
            {corridors.map((corridor) => {
              const start = positions.get(corridor.from)
              const end = positions.get(corridor.to)
              if (!start || !end) return null
              const traveled = [corridor.from, corridor.to].every((id) =>
                nodes.find((node) => node.id === id)?.status === 'complete')
              const arrow = getCorridorArrow({ corridor, start, end })
              return (
                <g
                  key={corridor.id}
                  className={`${corridor.pathRole}${traveled ? ' traveled' : ''}`}
                >
                  <image
                    href={arrow.image}
                    x={arrow.x}
                    y={arrow.y}
                    width={arrow.width}
                    height={arrow.height}
                    preserveAspectRatio="none"
                    transform={`rotate(${arrow.angle} ${arrow.centerX} ${arrow.centerY})`}
                  />
                </g>
              )
            })}
          </svg>
          {nodes.map((node) => {
            const position = positions.get(node.id)
            const selectable = canTravelToNode(map, currentNodeId, node.id, developerMode)
            return (
              <div className="room-node-position" style={{ left: `${position.x}%`, top: `${position.y}%` }} key={node.id}>
                <motion.button
                  type="button"
                  whileHover={selectable ? { scale: 1.08 } : {}}
                  disabled={!selectable}
                  className={`room-node ${node.status} ${node.type} ${node.pathRole}${developerMode ? ' developer-selectable' : ''}${node.id === currentNodeId ? ' current' : ''}`}
                  onClick={() => onSelect(node)}
                  aria-label={`${floor}층 ${labels[node.type]} 방${node.pathRole === 'risk' ? ' 위험 가지' : ''}`}
                >
                  <b>{symbols[node.type]}</b>
                  <small>{labels[node.type]}</small>
                </motion.button>
              </div>
            )
          })}
          <aside className="map-floor-summary">
            <b>{floor}F</b>
            <span>방 {selectedFloor.actualNodeCount}</span>
            <span>막다른 가지 {selectedFloor.branches.length}</span>
          </aside>
        </div>
      </div>
      <p className="map-hint">통로로 연결된 방을 탐험하고, 막다른 가지를 돌아 나온 뒤 계단 또는 보스로 향할 수 있습니다.</p>
    </ScreenFrame>
  )
}
