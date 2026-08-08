import { StatusEffectList } from './StatusEffectList.jsx'
import hpBarPlayer from '../../../assets/pictures/ui/hp_bar_player.png'
import hpBarBlock from '../../../assets/pictures/ui/hp_bar_player_block.png'
import hpBarEmpty from '../../../assets/pictures/ui/hp_bar_empty.png'
import blockBoxBase from '../../../assets/pictures/ui/block_box_base.png'
import blockPack from '../../../assets/pictures/ui/block_pack.png'
import formworkFrame from '../assets/pictures/formwork_alpha.png'

const HP_SEGMENT_COUNT = 20

export function BattleCenterOverlay({ health, maxHealth, armor, playerStatuses }) {
  const healthRatio = Math.max(0, Math.min(1, health / Math.max(1, maxHealth)))
  const filledSegments = health > 0
    ? Math.max(1, Math.ceil(healthRatio * HP_SEGMENT_COUNT))
    : 0

  return (
    <section className="battle-center-ui" aria-label="전투 중앙 UI">
      <div className="battle-center-ui__hp" aria-label={`체력 ${health}/${maxHealth}`}>
        <img className="battle-center-ui__hp-empty" src={hpBarEmpty} alt="" />
        <img className="battle-center-ui__hp-frame" src={hpBarPlayer} alt="" />
        <span className="battle-center-ui__hp-segments">
          {Array.from({ length: HP_SEGMENT_COUNT }, (_, index) => (
            <img className={index < filledSegments ? 'is-filled' : 'is-empty'} src={hpBarBlock} alt="" key={index} />
          ))}
          <strong>{health}/{maxHealth}</strong>
        </span>
        <StatusEffectList statuses={playerStatuses} ownerName="대장장이" />
        <small className={`battle-center-ui__armor${armor > 0 ? ' battle-center-ui__armor--active' : ''}`}>방어도 {armor}</small>
      </div>
      <img className="battle-center-ui__formwork" src={formworkFrame} alt="" />
      <div className="battle-center-ui__anvil" aria-label="보유 블록">
        <img className="battle-center-ui__anvil-frame" src={blockBoxBase} alt="" />
        <strong className="battle-center-ui__anvil-title">모루</strong>
        <img className="battle-center-ui__pack" src={blockPack} alt="" />
      </div>
    </section>
  )
}
