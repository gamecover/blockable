import { GameLogo } from './GameLogo.jsx'
import { useRunStore } from '../../game/state/runStoreContext.js'
import ashenFurnaceBackground from '../../assets/pictures/backgrounds/Ash_furance_alpha.png'
import floodedFoundryBackground from '../../assets/pictures/backgrounds/flooded_foundry_alpha.png'

export function ScreenFrame({ children, title, subtitle, compactLogo = true, actions, barVariant = 'alpha', showTopbar = false, dungeonId }) {
  const activeDungeonId = useRunStore((state) => state.activeDungeonId)
  const background = (dungeonId ?? activeDungeonId) === 'ashen-forge-west'
    ? floodedFoundryBackground
    : ashenFurnaceBackground

  return (
    <main
      className="screen-frame"
      style={{ '--screen-background-image': `url("${background}")` }}
    >
      {showTopbar && <header className={`topbar topbar--${barVariant}`}>
        <GameLogo compact={compactLogo} />
        <div className="screen-heading"><span>{subtitle}</span><h2>{title}</h2></div>
        <div className="top-actions">{actions}</div>
      </header>}
      <section className="screen-content">{children}</section>
    </main>
  )
}
