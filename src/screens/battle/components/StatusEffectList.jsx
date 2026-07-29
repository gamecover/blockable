import bleedingIcon from '../../../assets/pictures/ui/icons/Icon6_1_2.png'
import stunIcon from '../../../assets/pictures/ui/icons/Icon8_1_2.png'
import weaknessIcon from '../../../assets/pictures/ui/icons/Icon4_1_2.png'
import { STATUS_EFFECTS } from '../../../game/systems/statusEffectSystem.js'

const statusIcons = {
  bleeding: bleedingIcon,
  weakness: weaknessIcon,
  stun: stunIcon,
}

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
          <span aria-hidden="true">
            {statusIcons[id]
              ? <img className="status-effect__icon" src={statusIcons[id]} alt="" />
              : definition.icon}
          </span>
          <b>{definition.name}</b>
          <em>{stacks}</em>
        </span>
      ))}
    </div>
  )
}
