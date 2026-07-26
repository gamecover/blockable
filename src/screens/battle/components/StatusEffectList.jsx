import { STATUS_EFFECTS } from '../../../game/systems/statusEffectSystem.js'

export function StatusEffectList({ statuses = [], ownerName }) {
  const visibleStatuses = statuses
    .map((status) => ({ ...status, definition: STATUS_EFFECTS[status.id] }))
    .filter(({ definition, stacks }) => definition && stacks > 0)

  if (!visibleStatuses.length) return null

  return (
    <div className="status-effect-list" aria-label={`${ownerName} 상태 효과`}>
      {visibleStatuses.map(({ id, stacks, definition }) => (
        <span
          className={`status-effect status-effect--${definition.category}`}
          title={`${definition.categoryName} · ${definition.name} ${stacks}스택`}
          key={id}
        >
          <span aria-hidden="true">{definition.icon}</span>
          <b>{definition.name}</b>
          <em>{stacks}</em>
        </span>
      ))}
    </div>
  )
}
