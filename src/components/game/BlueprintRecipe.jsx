import { BLOCK_RULE_INDEX } from '../../game/systems/blockRulesSystem.js'
import { getBlueprintLayout } from '../../game/systems/blueprintSystem.js'

export function BlueprintRecipe({ combination, compact = false }) {
  const layout = getBlueprintLayout(combination)
  return (
    <div className={`blueprint-recipe${compact ? ' blueprint-recipe--compact' : ''}`}>
      <div
        className="blueprint-recipe__grid"
        style={{
          '--blueprint-columns': layout.width,
          '--blueprint-rows': layout.height,
        }}
        aria-hidden="true"
      >
        {layout.slots.flatMap((slot) => {
          const definition = BLOCK_RULE_INDEX.blocks.get(slot.block_id)
          return slot.cells.map((cell, index) => (
            <span
              className={`blueprint-recipe__cell ${definition.color_id}`}
              style={{ gridColumn: cell.x + 1, gridRow: cell.y + 1 }}
              key={`${slot.instance_id}-${index}`}
            />
          ))
        })}
      </div>
      <div className="blueprint-recipe__copy">
        <strong>{combination.display_name}</strong>
        {!compact && <small>{combination.description || `${combination.instances.length}개 블록 조합`}</small>}
      </div>
    </div>
  )
}
