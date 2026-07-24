import { motion } from 'motion/react'
import { ScreenFrame } from '../../components/ui/ScreenFrame.jsx'
import { canDeveloperEnterNode, getFloor, getMapEdges, getMapNodePosition, getMapNodes } from '../../game/systems/mapGenerationSystem.js'
import mapBase from './assets/pictures/map_base_alpha.png'
import straightArrow from './assets/pictures/map_arrow_short_01.png'
import diagonalArrow from './assets/pictures/map_arrow_short_02.png'

const symbols = { start: '◆', battle: '⚔', event: '?', boss: '♜' }
const labels = { start: '입구', battle: '전투', event: '사건', boss: '보스' }

export function MapScreen({
  map,
  floor,
  nodeStep,
  currentNodeId,
  health,
  maxHealth,
  gold,
  developerMode = false,
  onDebugAddGold,
  onSelect,
}) {
  const selectedFloor = getFloor(map, floor)
  const nodes = getMapNodes(map, floor)
  const positions = new Map(nodes.map((node) => [node.id, getMapNodePosition(map, node)]))
  const edges = getMapEdges(map, floor)

  return (
    <ScreenFrame title={`${map.dungeonName} 던전`} subtitle={`${floor}층 · ${nodeStep}/${selectedFloor.steps.length}`} barVariant="stage" actions={<div className="resource-bar map-resource-bar"><span>♥ {health}/{maxHealth}</span><span>◆ {gold}</span></div>}>
      <div className="map-toolbar">
        <div className="map-legend"><span><i className="dot available" /> 이동 가능</span><span><i className="dot complete" /> 완료</span><span>◆ 입구</span><span>⚔ 전투</span><span>? 이벤트</span><span>♜ 보스</span></div>
        {developerMode && <div className="developer-map-tools"><strong>DEV</strong><button type="button" onClick={onDebugAddGold}>골드 +1000</button></div>}
      </div>
      <div className="dungeon-map-viewport">
        <div className="dungeon-map" style={{ backgroundImage: `linear-gradient(#120e0b52,#17110d52), url(${mapBase})` }} aria-label={`${map.dungeonName} ${floor}층 지도`}>
          <svg className="map-connections" viewBox="0 0 1000 600" preserveAspectRatio="none" aria-hidden="true">
            {edges.map(({ from, to }) => {
              const start = positions.get(from)
              const end = positions.get(to)
              if (!start || !end) return null
              const completed = nodes.find(({ id }) => id === from)?.status === 'complete'
              const x1 = start.x * 10
              const y1 = start.y * 6
              const x2 = end.x * 10
              const y2 = end.y * 6
              const deltaX = x2 - x1
              const deltaY = y2 - y1
              const length = Math.hypot(deltaX, deltaY)
              const width = Math.max(1, length - 76)
              const height = width * 104 / 233
              const angle = Math.atan2(deltaY, deltaX) * 180 / Math.PI
              const arrow = Math.abs(deltaY) < 1 ? straightArrow : diagonalArrow
              const transform = `translate(${(x1 + x2) / 2} ${(y1 + y2) / 2}) rotate(${angle}) translate(${-width / 2} ${-height / 2})`
              return (
                <g key={`${from}-${to}`} className={completed ? 'traveled' : ''}>
                  <line x1={x1} y1={y1} x2={x2} y2={y2} />
                  <image href={arrow} width={width} height={height} transform={transform} preserveAspectRatio="xMidYMid meet" />
                </g>
              )
            })}
          </svg>
          {selectedFloor.steps.map((_, index) => {
            const step = index + 1
            const x = getMapNodePosition(map, { floor, step, lane: 0 }).x
            return <span className="node-step-number" style={{ left: `${x}%` }} key={step}>{floor}-{step}</span>
          })}
          {nodes.map((node) => {
            const position = positions.get(node.id)
            const developerSelectable = developerMode
              && canDeveloperEnterNode({ floor, step: nodeStep }, node)
            const selectable = node.status === 'available' || developerSelectable
            return (
              <div className="map-node-position" style={{ left: `${position.x}%`, top: `${position.y}%` }} key={node.id}>
                <motion.button
                  whileHover={selectable ? { scale: 1.08 } : {}}
                  disabled={!selectable}
                  className={`map-node ${node.status} ${node.type}${developerSelectable ? ' developer-selectable' : ''}${node.id === currentNodeId ? ' current' : ''}`}
                  onClick={() => onSelect(node)}
                  aria-label={`${node.floor}층 ${node.step}번째 위치 ${labels[node.type]}`}
                ><b>{symbols[node.type]}</b><small>{labels[node.type]}</small></motion.button>
              </div>
            )
          })}
        </div>
      </div>
      <p className="map-hint">현재 위치에서 오른쪽으로 연결된 다음 노드만 선택할 수 있습니다.</p>
    </ScreenFrame>
  )
}
