import { GameLogo } from '../../components/ui/GameLogo.jsx'

export function ResultScreen({ victory, floor, onMenu }) {
  return (
    <main className={`result-screen ${victory ? 'victory' : 'defeat'}`}>
      <GameLogo compact />
      <div className="result-symbol">{victory ? '♜' : '†'}</div>
      <span className="eyebrow">{victory ? 'DUNGEON CONQUERED' : 'THE FORGE GROWS COLD'}</span>
      <h2>{victory ? '마침내, 당신의 무기가 증명되었다.' : '원정은 여기서 끝났다.'}</h2>
      <p>{victory ? '녹슨 화룡이 무너지고 던전에 다시 망치 소리가 울려 퍼집니다.' : `${floor}층에서 쓰러졌습니다. 도구를 다시 벼려 도전하세요.`}</p>
      <button className="primary-button" onClick={onMenu}>메인 화면으로</button>
    </main>
  )
}
