import { GoldAmount } from '../../../components/ui/GoldAmount.jsx'
import playerHudFrame from '../assets/pictures/main_bar_left.png'
import turnHudFrame from '../assets/pictures/main_bar_middle.png'
import monsterHudFrame from '../assets/pictures/main_bar_right.png'

export function BattleHud({ gold, floor, turn, battleType, dungeonName, placedCount, placementLimit = 3 }) {
  return (
    <div className="battle-hud">
      <div className="battle-hud__status">
        <div className="battle-hud__panel battle-hud__floor">
          <img className="battle-hud__frame" src={playerHudFrame} alt="" />
          <div className="battle-hud__panel-content">
            <span>{battleType === 'boss' ? 'BOSS FLOOR' : `FLOOR ${floor}`}</span>
            <strong>{turn} TURN</strong>
            <small>{placedCount}/{placementLimit} 블록 배치</small>
          </div>
        </div>
        <div className="battle-hud__panel battle-hud__dungeon-name">
          <img className="battle-hud__frame" src={turnHudFrame} alt="" />
          <div className="battle-hud__panel-content">
            <strong>{dungeonName}</strong>
          </div>
        </div>
        <div className="battle-hud__panel battle-hud__utility">
          <img className="battle-hud__frame" src={monsterHudFrame} alt="" />
          <div className="battle-hud__panel-content">
            <GoldAmount amount={gold} />
            <span>Gold</span>
            <div className="battle-hud__menu-slot" aria-label="전투 메뉴" />
          </div>
        </div>
      </div>
    </div>
  )
}
