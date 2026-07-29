import { ScreenFrame } from '../../components/ui/ScreenFrame.jsx'

export function DungeonConquestScreen({ dungeonName, onContinue }) {
  return (
    <ScreenFrame title={dungeonName} subtitle="DUNGEON CONQUERED" barVariant="dungeon">
      <section className="dungeon-conquest" aria-live="polite">
        <div className="result-symbol">♜</div>
        <span className="eyebrow">정복 완료</span>
        <h2>{dungeonName}의 지배자가 쓰러졌습니다.</h2>
        <p>보스가 처치되고, 이 던전의 정복 기록이 전체 지도에 새겨졌습니다.</p>
        <button type="button" className="primary-button" onClick={onContinue}>
          전체 지도로 돌아가기
        </button>
      </section>
    </ScreenFrame>
  )
}
