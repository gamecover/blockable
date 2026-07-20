import { motion } from 'motion/react'
import { ScreenFrame } from '../../components/ui/ScreenFrame.jsx'

const symbols = { battle: '⚔', event: '?', boss: '♜' }
const labels = { battle: '전투', event: '사건', boss: '보스' }

export function MapScreen({ map, floor, health, maxHealth, gold, onSelect }) {
  return (
    <ScreenFrame title="잿빛 용광로 던전" subtitle={`FLOOR ${floor} / 10`} actions={<div className="resource-bar"><span>♥ {health}/{maxHealth}</span><span>◆ {gold}</span></div>}>
      <div className="map-legend"><span><i className="dot available" /> 이동 가능</span><span><i className="dot complete" /> 완료</span><span>⚔ 전투</span><span>? 이벤트</span></div>
      <div className="dungeon-map">
        {map.map((nodes, index) => (
          <div className="map-floor" key={index}>
            <span className="floor-number">{index + 1}</span>
            {nodes.map((node) => (
              <motion.button
                whileHover={node.status === 'available' ? { scale: 1.08 } : {}}
                key={node.id}
                disabled={node.status !== 'available'}
                className={`map-node ${node.status} ${node.type}`}
                onClick={() => onSelect(node)}
                aria-label={`${index + 1}층 ${labels[node.type]}`}
              ><b>{symbols[node.type]}</b><small>{labels[node.type]}</small></motion.button>
            ))}
          </div>
        ))}
        <div className="map-route" aria-hidden="true" />
      </div>
      <p className="map-hint">밝게 빛나는 다음 노드를 선택하세요. 지나간 길은 되돌아갈 수 없습니다.</p>
    </ScreenFrame>
  )
}
