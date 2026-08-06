import { BlueprintRecipe } from '../../../components/game/BlueprintRecipe.jsx'
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { GAME_EVENTS, gameBridge } from '../../../game/events/gameEvents.js'
import {
  getKnownBlueprints,
  getQuickCombinationPlan,
} from '../../../game/systems/blueprintSystem.js'
import { PLACEMENTS_PER_TURN } from '../../../game/constants/gameConfig.js'
import blueprintIcon from '../../../assets/pictures/ui/blueprint_icon.png'
import blueprintRecipeBase from '../../../assets/pictures/ui/blueprint_recipe_base.png'
import blueprintRecipeDetail from '../../../assets/pictures/ui/blueprint_recipe_detail.png'
import itemBox from '../../../assets/pictures/ui/item_box.png'

export function QuickBlueprintPanel({ hand, placedBlocks, discoveredBlueprintIds, allowedCombinationIds = null }) {
  const listRef = useRef(null)
  const dragRef = useRef(null)
  const [isListDragging, setIsListDragging] = useState(false)
  const [scrollIndicators, setScrollIndicators] = useState({ top: false, bottom: false })
  const [dragPreview, setDragPreview] = useState(null)
  const placedIds = new Set(placedBlocks.map(({ block }) => block.id))
  const availableBlocks = hand.filter(({ id }) => !placedIds.has(id))
  const remainingPlacements = PLACEMENTS_PER_TURN - placedBlocks.length
  const allowedIds = allowedCombinationIds ? new Set(allowedCombinationIds) : null
  const blueprints = getKnownBlueprints(discoveredBlueprintIds)
    .filter(({ id }) => !allowedIds || allowedIds.has(id))
    .map((combination) => ({
      combination,
      plan: combination.instances.length <= remainingPlacements
        ? getQuickCombinationPlan(combination.id, availableBlocks)
        : null,
    }))
    .filter(({ plan }) => plan)

  const stopListDrag = () => {
    dragRef.current = null
    setIsListDragging(false)
    setDragPreview(null)
  }

  const updateScrollIndicators = (target) => {
    setScrollIndicators({
      top: target.scrollTop > 1,
      bottom: target.scrollTop + target.clientHeight < target.scrollHeight - 1,
    })
  }

  useEffect(() => {
    if (listRef.current) updateScrollIndicators(listRef.current)
  }, [blueprints.length])

  return (
    <section className="battle-left-ui" aria-label="전투 왼쪽 UI">
      <img className="battle-left-ui__icon" src={blueprintIcon} alt="" />
      <aside className="quick-blueprints" data-tutorial-target="blueprint" aria-label="퀵 조합 청사진">
        <img className="quick-blueprints__frame" src={blueprintRecipeBase} alt="" />
        <header><strong>청사진</strong></header>
        {scrollIndicators.top && <span className="quick-blueprints__scroll-indicator quick-blueprints__scroll-indicator--top" aria-hidden="true">▲</span>}
        <div
          ref={listRef}
          className={`quick-blueprints__list${isListDragging ? ' is-dragging' : ''}`}
          onPointerDown={(event) => {
            if (event.button !== 0) return
            const item = event.target.closest('.quick-blueprints__item')
            const combination = blueprints.find(({ combination: candidate }) => candidate.id === item?.dataset.combinationId)?.combination
            dragRef.current = { pointerId: event.pointerId, combination, startX: event.clientX, startY: event.clientY, startScrollTop: event.currentTarget.scrollTop, mode: null }
            event.currentTarget.setPointerCapture(event.pointerId)
          }}
          onPointerMove={(event) => {
            const drag = dragRef.current
            if (!drag || drag.pointerId !== event.pointerId) return
            const deltaX = event.clientX - drag.startX
            const deltaY = event.clientY - drag.startY
            if (!drag.mode && Math.max(Math.abs(deltaX), Math.abs(deltaY)) < 8) return
            if (!drag.mode) drag.mode = Math.abs(deltaY) > Math.abs(deltaX) ? 'scroll' : 'block'
            if (drag.mode === 'scroll') {
              event.currentTarget.scrollTop = drag.startScrollTop - deltaY
              updateScrollIndicators(event.currentTarget)
              event.preventDefault()
              setIsListDragging(true)
              return
            }
            if (drag.combination) setDragPreview({ combination: drag.combination, x: event.clientX, y: event.clientY })
          }}
          onPointerUp={(event) => {
            const drag = dragRef.current
            if (drag?.mode === 'block' && drag.combination) {
              gameBridge.emit(GAME_EVENTS.QUICK_COMBINATION_DROP, { combinationId: drag.combination.id, clientX: event.clientX, clientY: event.clientY })
            }
            stopListDrag()
          }}
          onPointerCancel={stopListDrag}
          onScroll={(event) => updateScrollIndicators(event.currentTarget)}
        >
          {blueprints.length === 0
            ? <p className="quick-blueprints__empty">현재 가능한 조합 없음</p>
          : blueprints.map(({ combination }) => (
              <button
                type="button"
                className="quick-blueprints__item available"
                data-combination-id={combination.id}
                title={`${combination.display_name} 퀵 조합`}
                key={combination.id}
              >
                <img className="quick-blueprints__detail-frame" src={blueprintRecipeDetail} alt="" />
                <BlueprintRecipe combination={combination} />
                <span className="quick-blueprints__drag-image" aria-hidden="true">
                  <BlueprintRecipe combination={combination} compact />
                </span>
            </button>
          ))}
        </div>
        {scrollIndicators.bottom && <span className="quick-blueprints__scroll-indicator quick-blueprints__scroll-indicator--bottom" aria-hidden="true">▼</span>}
      </aside>
      <section className="quick-item-box" aria-label="아이템 상자">
        <img className="quick-item-box__frame" src={itemBox} alt="" />
        <strong>아이템 상자</strong>
      </section>
      {dragPreview && createPortal(
        <span className="blueprint-drag-preview" style={{ left: dragPreview.x, top: dragPreview.y }} aria-hidden="true">
          <BlueprintRecipe combination={dragPreview.combination} compact />
        </span>,
        document.body,
      )}
    </section>
  )
}
