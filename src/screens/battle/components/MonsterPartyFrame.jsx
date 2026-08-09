import { StatusEffectList } from './StatusEffectList.jsx'
import monsterCountFrame from '../../../assets/pictures/ui/monster_count_base.png'
import monsterDetailFrame from '../../../assets/pictures/ui/monster_detail.png'
import monsterInfoHalfFrame from '../../../assets/pictures/ui/monster_info_half_volcano.png'
import monsterInfoQuarterFrame from '../../../assets/pictures/ui/monster_info_quater_volcano.png'
import monsterHpNormal from '../../../assets/pictures/ui/hp_bar_monster_normal.png'
import monsterHpElite from '../../../assets/pictures/ui/hp_bar_monster_elite.png'
import monsterHpBoss from '../../../assets/pictures/ui/hp_bar_monster_boss.png'
import monsterHpBlock from '../../../assets/pictures/ui/hp_bar_monster_block.png'
import monsterHpEmpty from '../../../assets/pictures/ui/hp_bar_monster_empty.png'
import { describeMonsterAbilityPreview } from '../../../game/systems/monsterDesignSystem.js'

const SLOTS = [1, 2, 3, 4, 5]

export function MonsterPartyFrame({
  combatants,
  selectedMonsterId,
  activeMonsterId,
  presentationMonsterId = null,
  presentationMotion = null,
  targetSlotIds,
  canSelect,
  onSelect,
  battleType,
  playerStatuses = [],
}) {
  const bySlot = new Map(combatants.map((entry) => [entry.slotId, entry]))
  const selectedMonster = combatants.find(({ instanceId }) => instanceId === selectedMonsterId)
  const detailMonster = combatants.find(({ instanceId }) => instanceId === presentationMonsterId)
    ?? selectedMonster
  const healthSegments = Array.from({ length: 20 }, (_, index) => index)
  const selectedMonsterGrade = battleType === 'boss'
    ? 'boss'
    : (detailMonster?.gradeId === 'elite' || detailMonster?.grade === 'elite' ? 'elite' : 'normal')
  const healthFrame = { normal: monsterHpNormal, elite: monsterHpElite, boss: monsterHpBoss }[selectedMonsterGrade]
  const selectedMonsterAbility = selectedMonster?.currentHealth > 0
    ? describeMonsterAbilityPreview(selectedMonster.turnPlan?.ability, {
        attackerStatuses: selectedMonster.statuses,
        defenderStatuses: playerStatuses,
      })
    : describeMonsterAbilityPreview(null)
  const filledHealthSegmentCount = detailMonster?.currentHealth > 0
    ? Math.max(1, Math.ceil(detailMonster.currentHealth / detailMonster.health * healthSegments.length))
    : 0
  const monsterStatusList = (
    <StatusEffectList
      statuses={detailMonster?.statuses}
      ownerName={detailMonster?.name}
      className="monster-party-frame__status-list"
      style={selectedMonsterGrade === 'boss' ? { '--monster-status-anchor': '40.88%' } : undefined}
    />
  )
  const countFrame = combatants.length <= 2 ? monsterInfoHalfFrame : monsterInfoQuarterFrame
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
        style={{
          '--monster-slot-image': monster.imageUrl ? `url(${monster.imageUrl})` : 'none',
          '--monster-card-frame': `url(${countFrame})`,
        }}
        disabled={!canSelect}
        onClick={() => onSelect(monster.instanceId)}
        aria-label={`${slotId}번 ${monster.name}, 체력 ${monster.currentHealth}/${monster.health}${selected ? ', 현재 중심 대상' : inRange ? ', 범위 대상' : ''}`}
      >
        <b>{slotId}</b>
        {monster.imageUrl && (
          <span className="monster-party-frame__slot-portrait" aria-hidden="true">
            <img src={monster.imageUrl} alt="" />
          </span>
        )}
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
      <section className="monster-party-frame__count" data-tutorial-target="monsters" aria-label="참여 적 목록">
        <img className="monster-party-frame__frame" src={monsterCountFrame} alt="" aria-hidden="true" />
        <strong className="monster-party-frame__count-title">적 정보</strong>
        <div className="monster-party-frame__count-content">
          <div
            className={`monster-party-frame__normal monster-party-frame__normal--${combatants.length <= 2 ? 'half' : 'quarter'}`}
          >
            {combatants
              .filter(({ currentHealth }) => currentHealth > 0)
              .sort((left, right) => left.slotId - right.slotId)
              .slice(0, 4)
              .map(({ slotId }) => renderSlot(slotId))}
          </div>
        </div>
      </section>
      <section className="monster-party-frame__detail" aria-label="선택된 적 정보">
        <img className="monster-party-frame__frame" src={monsterDetailFrame} alt="" aria-hidden="true" />
        {detailMonster && (
          <div className="monster-party-frame__detail-content">
            <span className="monster-party-frame__detail-label">적 상세 정보</span>
            <strong className="monster-party-frame__selected-name" style={{ left: '13%', right: 'auto', top: '6%', width: '46%', height: '12%', justifyContent: 'start', textAlign: 'left' }}><span className="monster-party-frame__selected-name-text">{detailMonster.name}</span></strong>
            <span className="monster-party-frame__ability-detail" aria-label={`${selectedMonster?.name ?? detailMonster.name} 이번 턴 행동`}>
              <b>{selectedMonsterAbility.label}</b>
              {selectedMonsterAbility.range && <small>{selectedMonsterAbility.expectedDamage > 0 ? `피해 ${selectedMonsterAbility.expectedDamage}` : '피해 없음'} · 범위 {selectedMonsterAbility.range}</small>}
              {selectedMonsterAbility.effects.length > 0 && <em>{selectedMonsterAbility.effects.join(' · ')}</em>}
            </span>
            <span className="monster-party-frame__portrait" style={{ gridRow: 3, alignSelf: 'center', justifySelf: 'stretch', height: '100%', paddingTop: '7%', boxSizing: 'border-box' }}>
              <span className={`monster-party-frame__portrait-motion${presentationMotion?.monsterId === detailMonster.instanceId ? ` is-${presentationMotion.type}` : ''}`}>
                {detailMonster.imageUrl
                  ? <img src={detailMonster.imageUrl} alt="" />
                  : <i aria-hidden="true">{detailMonster.glyph}</i>}
              </span>
            </span>
            {selectedMonsterGrade === 'boss' && monsterStatusList}
            <span className={`monster-party-frame__health monster-party-frame__health--${selectedMonsterGrade}`} style={{ gridRow: 5, alignSelf: 'end', justifySelf: 'stretch' }}>
              <img className="monster-party-frame__health-frame" src={healthFrame} alt="" />
              {selectedMonsterGrade !== 'boss' && monsterStatusList}
            </span>
            <span className={`monster-party-frame__health-segments monster-party-frame__health-segments--${selectedMonsterGrade}`}>
              {healthSegments.map((index) => (
                <img className={index < filledHealthSegmentCount ? 'is-filled' : 'is-empty'} key={index} src={index < filledHealthSegmentCount ? monsterHpBlock : monsterHpEmpty} alt="" />
              ))}
              <small className="monster-party-frame__health-value">{detailMonster.currentHealth}/{detailMonster.health}</small>
            </span>
          </div>
        )}
      </section>
    </div>
  )
}
