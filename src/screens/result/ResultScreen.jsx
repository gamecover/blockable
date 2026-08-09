import { GameLogo } from '../../components/ui/GameLogo.jsx'
import defeatedBackground from '../../assets/pictures/backgrounds/defeated.png'
import victoryBackground from '../../assets/pictures/backgrounds/victory.png'

export function ResultScreen({ victory, floor, deathCause, victoryBossName, onMenu }) {
  const resultBackground = victory ? victoryBackground : defeatedBackground
  const deathMessage = deathCause
    ? deathCause.causeType === 'status'
      ? deathCause.sourceName
        ? `당신은 ${deathCause.sourceName}에게 부여된 ${deathCause.effectName}으로 ${deathCause.damage} 피해를 받고 사망했습니다.`
        : `당신은 ${deathCause.effectName}으로 ${deathCause.damage} 피해를 받고 사망했습니다.`
      : deathCause.sourceName
        ? `당신은 ${deathCause.sourceName}에게 ${deathCause.effectName} ${deathCause.damage} 피해를 받고 사망했습니다.`
      : `당신은 ${deathCause.effectName} ${deathCause.damage} 피해를 받고 사망했습니다.`
    : null
  const deathLocation = deathCause?.dungeonName
    ? `${deathCause.dungeonName} ${deathCause.floorNumber ?? floor}층에서 쓰러졌습니다.`
    : `${floor}층에서 쓰러졌습니다. 도구를 다시 벼려 도전하세요.`
  const victoryMessage = `${victoryBossName || '최종 보스'}을 물리치고, 대장간에 다시 망치 소리가 울려 퍼집니다.`
  return (
    <main
      className={`result-screen ${victory ? 'victory' : 'defeat'}`}
      style={{ '--result-background-image': `url("${resultBackground}")` }}
    >
      <GameLogo compact />
      <span className="eyebrow">{victory ? 'DUNGEON CONQUERED' : 'THE FORGE GROWS COLD'}</span>
      <h2>{victory ? '마침내, 당신의 무기가 증명되었다.' : '원정은 여기서 끝났다.'}</h2>
      {victory && <p>{victoryMessage}</p>}
      {!victory && deathMessage && <p>{deathMessage}</p>}
      {!victory && <p>{deathLocation}</p>}
      <button className="primary-button" onClick={onMenu}>메인 화면으로</button>
    </main>
  )
}
