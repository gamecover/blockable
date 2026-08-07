import { StatusEffectList } from './StatusEffectList.jsx'
import monsterCountFrame from '../../../assets/pictures/ui/monster_count_base.png'
import monsterDetailFrame from '../../../assets/pictures/ui/monster_detail.png'

const SLOTS = [1, 2, 3, 4, 5]

export function MonsterPartyFrame({
  combatants,
  selectedMonsterId,
  activeMonsterId,
  targetSlotIds,
  canSelect,
  onSelect,
}) {
  const bySlot = new Map(combatants.map((entry) => [entry.slotId, entry]))
  const selectedMonster = combatants.find(({ instanceId }) => instanceId === selectedMonsterId)
  const renderSlot = (slotId) => {
    const monster = bySlot.get(slotId)
    if (!monster) return <span className={`monster-party-frame__placeholder slot-${slotId}`} key={slotId} aria-hidden="true" />
    const selected = monster?.instanceId === selectedMonsterId
    const acting = monster?.instanceId === activeMonsterId
    const inRange = targetSlotIds.includes(slotId)
    const dead = monster.currentHealth <= 0
    if (dead) {
      return (
        <span
          className={`monster-party-frame__slot monster-party-frame__slot--vacated slot-${slotId}`}
          key={slotId}
          role="img"
          aria-label={`${slotId}번, 몬스터 사망으로 비어진 슬롯`}
        >
          <b>{slotId}</b>
          <span><strong>사망</strong><i aria-hidden="true" /></span>
        </span>
      )
    }
    return (
      <button
        type="button"
        key={slotId}
        className={`monster-party-frame__slot slot-${slotId}${selected ? ' selected' : ''}${inRange ? ' in-range' : ''}${acting ? ' acting' : ''}`}
        disabled={!canSelect}
        onClick={() => onSelect(monster.instanceId)}
        aria-label={`${slotId}번 ${monster.name}, 체력 ${monster.currentHealth}/${monster.health}${selected ? ', 현재 중심 대상' : inRange ? ', 범위 대상' : ''}`}
      >
        <b>{slotId}</b>
        <span>
          <strong>{monster.name}</strong>
          <i><em style={{ width: `${Math.max(0, monster.currentHealth / monster.health) * 100}%` }} /></i>
          <small>{monster.currentHealth}/{monster.health}</small>
        </span>
      </button>
    )
  }

  return (
    <div className="monster-party-frame" aria-label="몬스터 고정 슬롯 정보">
      <section className="monster-party-frame__count" aria-label="참여 적 목록">
        <img className="monster-party-frame__frame" src={monsterCountFrame} alt="" aria-hidden="true" />
        <div className="monster-party-frame__count-content">
          <strong>적 정보 {combatants.length}</strong>
          <div className="monster-party-frame__normal">{SLOTS.map(renderSlot)}</div>
        </div>
      </section>
      <section className="monster-party-frame__detail" aria-label="선택된 적 정보">
        <img className="monster-party-frame__frame" src={monsterDetailFrame} alt="" aria-hidden="true" />
        {selectedMonster && (
          <div className="monster-party-frame__detail-content">
            <span className="monster-party-frame__detail-label">적 상세 정보</span>
            <strong>{selectedMonster.name}</strong>
            <span className="monster-party-frame__health">
              <i style={{ width: `${Math.max(0, selectedMonster.currentHealth / selectedMonster.health) * 100}%` }} />
            </span>
            <small>{selectedMonster.currentHealth}/{selectedMonster.health}</small>
            <StatusEffectList statuses={selectedMonster.statuses} ownerName={selectedMonster.name} />
          </div>
        )}
      </section>
    </div>
  )
}
