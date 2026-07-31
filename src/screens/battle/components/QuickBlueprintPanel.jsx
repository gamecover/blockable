import { BlueprintRecipe } from '../../../components/game/BlueprintRecipe.jsx'
import { GAME_EVENTS, gameBridge } from '../../../game/events/gameEvents.js'
import {
  getKnownBlueprints,
  getQuickCombinationPlan,
} from '../../../game/systems/blueprintSystem.js'
import { PLACEMENTS_PER_TURN } from '../../../game/constants/gameConfig.js'

export function QuickBlueprintPanel({ hand, placedBlocks, discoveredBlueprintIds, allowedCombinationIds = null }) {
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

  return (
    <aside className="quick-blueprints" data-tutorial-target="blueprint" aria-label="퀵 조합 청사진">
      <header>
        <strong>퀵 조합</strong>
        <small>거푸집으로 드래그</small>
      </header>
      <div className="quick-blueprints__list">
        {blueprints.length === 0
          ? <p className="quick-blueprints__empty">현재 가능한 조합 없음</p>
          : blueprints.map(({ combination }) => (
            <button
              type="button"
              className="quick-blueprints__item available"
              draggable
              title={`${combination.display_name} 퀵 조합`}
              onDragStart={(event) => {
                const dragImage = event.currentTarget.querySelector('.quick-blueprints__drag-image')
                event.dataTransfer.effectAllowed = 'move'
                event.dataTransfer.setData('text/plain', combination.id)
                event.dataTransfer.setDragImage(
                  dragImage,
                  dragImage.offsetWidth / 2,
                  dragImage.offsetHeight / 2,
                )
              }}
              onDragEnd={(event) => {
                if (!event.clientX && !event.clientY) return
                gameBridge.emit(GAME_EVENTS.QUICK_COMBINATION_DROP, {
                  combinationId: combination.id,
                  clientX: event.clientX,
                  clientY: event.clientY,
                })
              }}
              key={combination.id}
            >
              <BlueprintRecipe combination={combination} compact />
              <span className="quick-blueprints__drag-image" aria-hidden="true">
                <BlueprintRecipe combination={combination} compact />
              </span>
            </button>
          ))}
      </div>
    </aside>
  )
}
