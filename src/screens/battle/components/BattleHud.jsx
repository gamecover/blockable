export function BattleHud({ health, maxHealth, armor, gold, floor, turn, monster, placedCount }) {
  return (
    <div className="battle-hud">
      <div className="hud-card player"><span>대장장이</span><strong>♥ {health}/{maxHealth}</strong><small>방어도 {armor}</small></div>
      <div className="turn-plaque"><span>FLOOR {floor}</span><strong>TURN {turn}</strong><small>{placedCount}/3 블록 배치</small></div>
      <div className="hud-card monster"><span>{monster.name}</span><strong>♥ {monster.currentHealth}/{monster.health}</strong><small>다음 행동: ⚔ {monster.damage}</small></div>
      <span className="battle-gold">◆ {gold}</span>
    </div>
  )
}
