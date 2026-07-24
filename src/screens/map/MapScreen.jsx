import { motion } from 'motion/react'
import { ScreenFrame } from '../../components/ui/ScreenFrame.jsx'
import { canDeveloperEnterNode, getFloor, getMapEdges, getMapNodePosition, getMapNodes } from '../../game/systems/mapGenerationSystem.js'

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
      <div className="dungeon-map" aria-label={`${map.dungeonName} ${floor}층 지도`}>
        <svg className="map-connections" viewBox="0 0 1000 600" preserveAspectRatio="none" aria-hidden="true">
          {edges.map(({ from, to }) => {
            const start = positions.get(from)
            const end = positions.get(to)
            if (!start || !end) return null
            const completed = nodes.find(({ id }) => id === from)?.status === 'complete'
            return <line key={`${from}-${to}`} x1={start.x * 10} y1={start.y * 6} x2={end.x * 10} y2={end.y * 6} className={completed ? 'traveled' : ''} />
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
      <p className="map-hint">현재 위치에서 오른쪽으로 연결된 다음 노드만 선택할 수 있습니다.</p>
    </ScreenFrame>
  )
}
