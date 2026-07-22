import { motion } from 'motion/react'
import { ScreenFrame } from '../../components/ui/ScreenFrame.jsx'
import { getMapEdges, getMapNodePosition } from '../../game/systems/mapGenerationSystem.js'

const symbols = { battle: '⚔', event: '?', boss: '♜' }
const labels = { battle: '전투', event: '사건', boss: '보스' }

export function MapScreen({ map, floor, health, maxHealth, gold, onSelect }) {
  const nodes = map.flat()
  const positions = new Map(nodes.map((node) => [node.id, getMapNodePosition(map, node)]))
  const edges = getMapEdges(map)

  return (
    <ScreenFrame title="잿빛 용광로 던전" subtitle={`FLOOR ${floor} / 10`} actions={<div className="resource-bar map-resource-bar"><span>♥ {health}/{maxHealth}</span><span>◆ {gold}</span></div>}>
      <div className="map-legend"><span><i className="dot available" /> 이동 가능</span><span><i className="dot complete" /> 완료</span><span>⚔ 전투</span><span>? 이벤트</span></div>
      <div className="dungeon-map">
        <svg className="map-connections" viewBox="0 0 1000 600" preserveAspectRatio="none" aria-hidden="true">
          {edges.map(({ from, to }) => {
            const start = positions.get(from)
            const end = positions.get(to)
            if (!start || !end) return null
            const completed = nodes.find(({ id }) => id === from)?.status === 'complete'
            return <line key={`${from}-${to}`} x1={start.x * 10} y1={start.y * 6} x2={end.x * 10} y2={end.y * 6} className={completed ? 'traveled' : ''} />
          })}
        </svg>
        {map.map((_, index) => <span className="floor-number" style={{ left: `${getMapNodePosition(map, { floor: index + 1, lane: 0 }).x}%` }} key={index}>{index + 1}</span>)}
        {nodes.map((node) => {
          const position = positions.get(node.id)
          return (
            <div className="map-node-position" style={{ left: `${position.x}%`, top: `${position.y}%` }} key={node.id}>
              <motion.button
                whileHover={node.status === 'available' ? { scale: 1.08 } : {}}
                disabled={node.status !== 'available'}
                className={`map-node ${node.status} ${node.type}`}
                onClick={() => onSelect(node)}
                aria-label={`${node.floor}층 ${labels[node.type]}`}
              ><b>{symbols[node.type]}</b><small>{labels[node.type]}</small></motion.button>
            </div>
          )
        })}
      </div>
      <p className="map-hint">현재 노드에서 오른쪽으로 연결된 다음 노드만 선택할 수 있습니다.</p>
    </ScreenFrame>
  )
}
