import armorIcon from '../../../assets/icons/status/armor.png'
import bleedingIcon from '../../../assets/icons/status/bleeding.png'
import burnIcon from '../../../assets/icons/status/burn.png'
import chillIcon from '../../../assets/icons/status/chill.png'
import poisonIcon from '../../../assets/icons/status/poison.png'
import rageIcon from '../../../assets/icons/status/rage.png'
import stunIcon from '../../../assets/icons/status/stun.png'
import weaknessIcon from '../../../assets/icons/status/weakness.png'
import woundIcon from '../../../assets/icons/status/wound.png'
import { STATUS_EFFECTS } from '../../../game/systems/statusEffectSystem.js'

const statusIcons = {
  armor: armorIcon,
  bleeding: bleedingIcon,
  burn: burnIcon,
  chill: chillIcon,
  poison: poisonIcon,
  rage: rageIcon,
  weakness: weaknessIcon,
  stun: stunIcon,
  wound: woundIcon,
}

const STATUS_DISPLAY_PRIORITY = Object.freeze({
  buff: 0,
  debuff: 1,
  damage: 2,
  control: 3,
})

export function StatusEffectList({ statuses = [], ownerName, className = '', style }) {
  const visibleStatuses = statuses
    .map((status) => ({ ...status, definition: STATUS_EFFECTS[status.id] }))
    .filter(({ definition, stacks }) => definition && stacks > 0)
    .sort((left, right) =>
      STATUS_DISPLAY_PRIORITY[left.definition.category] - STATUS_DISPLAY_PRIORITY[right.definition.category])

  if (!visibleStatuses.length) return null

  return (
    <div className={`status-effect-list ${className}`.trim()} style={style} aria-label={`${ownerName} 상태 효과`}>
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
            <em>{stacks}</em>
          </span>
          <b>{definition.name}</b>
        </span>
      ))}
    </div>
  )
}
