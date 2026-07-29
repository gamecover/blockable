import { StatusEffectList } from './StatusEffectList.jsx'
import { GoldAmount } from '../../../components/ui/GoldAmount.jsx'

export function BattleHud({ health, maxHealth, armor, gold, floor, turn, monster, placedCount, placementLimit = 3, playerStatuses }) {
  return (
    <div className="battle-hud">
      <div className="battle-hud__status">
        <div className="hud-card player"><span>대장장이</span><strong>♥ {health}/{maxHealth}</strong><small>방어도 {armor} · <em><GoldAmount amount={gold} /></em></small><StatusEffectList statuses={playerStatuses} ownerName="대장장이" /></div>
        <div className="turn-plaque"><span>FLOOR {floor}</span><strong>TURN {turn}</strong><small>{placedCount}/{placementLimit} 블록 배치</small></div>
        <div className="hud-card monster"><span>{monster.name}</span><strong>♥ {monster.currentHealth}/{monster.health}</strong><small>다음 행동: {monster.intent.icon} {monster.intent.label}{monster.intent.amount ? ` · ${monster.intent.amount}` : ''}{monster.armor ? ` · 방어도 ${monster.armor}` : ''}</small></div>
      </div>
    </div>
  )
}
