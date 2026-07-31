import ashenFurnaceBackground from '../../assets/pictures/backgrounds/Ash_furance_alpha.png'
import floodedFoundryBackground from '../../assets/pictures/backgrounds/flooded_foundry_alpha.png'

export function DungeonLoadingScreen({
  dungeonId,
  title,
  message = '원정에 필요한 준비를 하고 있습니다.',
  error = '',
  onRetry,
  onContinue,
}) {
  const background = dungeonId === 'ashen-forge-west'
    ? floodedFoundryBackground
    : ashenFurnaceBackground

  return (
    <main
      className="dungeon-loading"
      style={{ '--dungeon-loading-background': `url("${background}")` }}
      aria-busy={!error}
    >
      <section className="dungeon-loading__panel" role="status" aria-live="polite">
        <small>원정 준비</small>
        <h1>{title}</h1>
        {error
          ? <>
              <p className="dungeon-loading__error">{error}</p>
              <div className="dungeon-loading__actions">
                <button type="button" onClick={onRetry}>다시 시도</button>
                <button type="button" onClick={onContinue}>음악 없이 계속</button>
              </div>
            </>
          : <>
              <div className="dungeon-loading__track"><span /></div>
              <p>{message}</p>
            </>}
      </section>
    </main>
  )
}
