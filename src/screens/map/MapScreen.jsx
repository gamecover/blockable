import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { GoldAmount } from '../../components/ui/GoldAmount.jsx'
import { ScreenFrame } from '../../components/ui/ScreenFrame.jsx'
import {
  canTravelToNode,
  getMapEdges,
  getMapNodeDistances,
  getMapNodePosition,
  getMapNodes,
} from '../../game/systems/mapGenerationSystem.js'
import mapArrowCurveUp from './assets/pictures/map_arrow_01.png'
import mapArrowLong from './assets/pictures/map_arrow_02.png'
import mapArrowCurveDown from './assets/pictures/map_arrow_03.png'
import mapArrowShort from './assets/pictures/map_arrow_short_01.png'
import mapArrowShortCurve from './assets/pictures/map_arrow_short_02.png'
import mapBase from './assets/pictures/map_base_alpha.png'

const MAP_CANVAS_WIDTH = 2600
const MAP_CANVAS_HEIGHT = Math.round(MAP_CANVAS_WIDTH * 1066 / 3110)
const DEFAULT_MAP_ZOOM = 0.72
const MIN_MAP_ZOOM = 0.55
const MAX_MAP_ZOOM = 1.25
const MAP_ZOOM_STEP = 0.1
const MAP_EDGE_PADDING = 48

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
  const [developerMapRevealed, setDeveloperMapRevealed] = useState(false)
  const [mapView, setMapView] = useState({
    x: 0,
    y: 0,
    zoom: DEFAULT_MAP_ZOOM,
  })
  const viewportRef = useRef(null)
  const dragRef = useRef(null)
  const nodes = getMapNodes(map, floor)
  const nodeDistances = getMapNodeDistances(map, floor, currentNodeId)
  const getVisibility = (node) => {
    if (developerMode && developerMapRevealed) return 'known'
    const distance = nodeDistances.get(node.id)
    if (
      node.status === 'complete'
      || node.revealState === 'revealed'
      || distance <= 1
    ) return 'known'
    if (node.revealState === 'mystery' || distance === 2) return 'mystery'
    return 'hidden'
  }
  const visibleNodes = nodes.filter((node) => getVisibility(node) !== 'hidden')
  const knownNodes = visibleNodes.filter((node) => getVisibility(node) === 'known')
  const visibleNodeIds = new Set(visibleNodes.map(({ id }) => id))
  const positions = useMemo(
    () => new Map(nodes.map((node) => [node.id, getMapNodePosition(map, node)])),
    [map, nodes],
  )
  const corridors = getMapEdges(map, floor)
  const clampMapView = useCallback((view) => {
    const viewport = viewportRef.current
    if (!viewport) return view
    const scaledWidth = MAP_CANVAS_WIDTH * view.zoom
    const scaledHeight = MAP_CANVAS_HEIGHT * view.zoom
    const centerX = (viewport.clientWidth - scaledWidth) / 2
    const centerY = (viewport.clientHeight - scaledHeight) / 2
    const clampAxis = (value, viewportSize, scaledSize, centered) => {
      if (scaledSize <= viewportSize) return centered
      return Math.min(
        MAP_EDGE_PADDING,
        Math.max(viewportSize - scaledSize - MAP_EDGE_PADDING, value),
      )
    }
    return {
      ...view,
      x: clampAxis(view.x, viewport.clientWidth, scaledWidth, centerX),
      y: clampAxis(view.y, viewport.clientHeight, scaledHeight, centerY),
    }
  }, [])

  const centerCurrentNode = useCallback((zoom = DEFAULT_MAP_ZOOM) => {
    const viewport = viewportRef.current
    const position = positions.get(currentNodeId)
    if (!viewport || !position) return
    setMapView(clampMapView({
      zoom,
      x: viewport.clientWidth / 2 - MAP_CANVAS_WIDTH * position.x / 100 * zoom,
      y: viewport.clientHeight / 2 - MAP_CANVAS_HEIGHT * position.y / 100 * zoom,
    }))
  }, [clampMapView, currentNodeId, positions])

  useEffect(() => {
    const frameId = requestAnimationFrame(() => centerCurrentNode())
    const handleResize = () => setMapView((current) => clampMapView(current))
    window.addEventListener('resize', handleResize)
    return () => {
      cancelAnimationFrame(frameId)
      window.removeEventListener('resize', handleResize)
    }
  }, [centerCurrentNode, clampMapView, floor])

  const handleMapPointerDown = (event) => {
    if (event.button !== 0 || event.target.closest('button')) return
    viewportRef.current?.setPointerCapture(event.pointerId)
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      mapX: mapView.x,
      mapY: mapView.y,
    }
    viewportRef.current?.classList.add('is-dragging')
  }

  const handleMapPointerMove = (event) => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) return
    setMapView((current) => clampMapView({
      ...current,
      x: drag.mapX + event.clientX - drag.startX,
      y: drag.mapY + event.clientY - drag.startY,
    }))
  }

  const finishMapDrag = (event) => {
    if (dragRef.current?.pointerId !== event.pointerId) return
    dragRef.current = null
    viewportRef.current?.classList.remove('is-dragging')
    if (viewportRef.current?.hasPointerCapture(event.pointerId)) {
      viewportRef.current.releasePointerCapture(event.pointerId)
    }
  }

  const changeMapZoom = (amount) => {
    const viewport = viewportRef.current
    if (!viewport) return
    setMapView((current) => {
      const zoom = Math.min(
        MAX_MAP_ZOOM,
        Math.max(MIN_MAP_ZOOM, Number((current.zoom + amount).toFixed(2))),
      )
      const ratio = zoom / current.zoom
      const centerX = viewport.clientWidth / 2
      const centerY = viewport.clientHeight / 2
      return clampMapView({
        zoom,
        x: centerX - (centerX - current.x) * ratio,
        y: centerY - (centerY - current.y) * ratio,
      })
    })
  }

  const handleMapKeyDown = (event) => {
    const movement = {
      ArrowLeft: [60, 0],
      ArrowRight: [-60, 0],
      ArrowUp: [0, 60],
      ArrowDown: [0, -60],
    }[event.key]
    if (movement) {
      event.preventDefault()
      setMapView((current) => clampMapView({
        ...current,
        x: current.x + movement[0],
        y: current.y + movement[1],
      }))
    }
  }

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
              <button
                type="button"
                aria-pressed={developerMapRevealed}
                onClick={() => setDeveloperMapRevealed((revealed) => !revealed)}
              >
                {developerMapRevealed ? '가시 범위 적용' : '던전 맵 전체 보기'}
              </button>
            </div>
          </div>
        )}
      </div>
      <div
        ref={viewportRef}
        className="dungeon-map-viewport"
        role="region"
        tabIndex="0"
        aria-label={`${map.dungeonName} ${floor}층 지도. 배경을 드래그하거나 방향키로 이동할 수 있습니다.`}
        onKeyDown={handleMapKeyDown}
        onPointerDown={handleMapPointerDown}
        onPointerMove={handleMapPointerMove}
        onPointerUp={finishMapDrag}
        onPointerCancel={finishMapDrag}
      >
        <div
          className="dungeon-map dungeon-map--rooms"
          style={{
            backgroundImage: `url(${mapBase})`,
            width: MAP_CANVAS_WIDTH,
            height: MAP_CANVAS_HEIGHT,
            transform: `translate3d(${mapView.x}px, ${mapView.y}px, 0) scale(${mapView.zoom})`,
          }}
          aria-label={`${map.dungeonName} ${floor}층 방 지도`}
        >
          <svg className="room-corridors" viewBox="0 0 1000 600" preserveAspectRatio="none" aria-hidden="true">
            {corridors.map((corridor) => {
              if (!visibleNodeIds.has(corridor.from) || !visibleNodeIds.has(corridor.to)) {
                return null
              }
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
          {visibleNodes.map((node) => {
            const position = positions.get(node.id)
            const visibility = getVisibility(node)
            const mystery = visibility === 'mystery'
            const selectable = !mystery
              && canTravelToNode(map, currentNodeId, node.id, developerMode)
            return (
              <div className="room-node-position" style={{ left: `${position.x}%`, top: `${position.y}%` }} key={node.id}>
                <motion.button
                  type="button"
                  whileHover={selectable ? { scale: 1.08 } : {}}
                  disabled={!selectable}
                  className={mystery
                    ? 'room-node locked mystery'
                    : `room-node ${node.status} ${node.type} ${node.pathRole}${developerMode ? ' developer-selectable' : ''}${selectable && node.id !== currentNodeId ? ' reachable' : ''}${node.id === currentNodeId ? ' current' : ''}`}
                  onClick={() => onSelect(node)}
                  aria-label={mystery
                    ? `${floor}층 미확인 방`
                    : `${floor}층 ${labels[node.type]} 방${node.pathRole === 'risk' ? ' 위험 가지' : ''}`}
                >
                  <b>{mystery ? '?' : symbols[node.type]}</b>
                  <small>{mystery ? '미확인' : labels[node.type]}</small>
                </motion.button>
              </div>
            )
          })}
          <aside className="map-floor-summary">
            <b>{floor}F</b>
            <span>발견한 방 {knownNodes.length}</span>
          </aside>
        </div>
        <div className="map-zoom-controls" aria-label="지도 확대 및 축소">
          <button
            type="button"
            onClick={() => changeMapZoom(MAP_ZOOM_STEP)}
            disabled={mapView.zoom >= MAX_MAP_ZOOM}
            aria-label="지도 확대"
          >
            +
          </button>
          <output aria-label={`지도 확대율 ${Math.round(mapView.zoom * 100)}퍼센트`}>
            {Math.round(mapView.zoom * 100)}%
          </output>
          <button
            type="button"
            onClick={() => changeMapZoom(-MAP_ZOOM_STEP)}
            disabled={mapView.zoom <= MIN_MAP_ZOOM}
            aria-label="지도 축소"
          >
            −
          </button>
        </div>
      </div>
      <p className="map-hint">통로로 연결된 방을 탐험하고, 막다른 가지를 돌아 나온 뒤 계단 또는 보스로 향할 수 있습니다.</p>
    </ScreenFrame>
  )
}
