import { GameLogo } from './GameLogo.jsx'

export function ScreenFrame({ children, title, subtitle, compactLogo = true, actions, barVariant = 'alpha' }) {
  return (
    <main className="screen-frame">
      <header className={`topbar topbar--${barVariant}`}>
        <GameLogo compact={compactLogo} />
        <div className="screen-heading"><span>{subtitle}</span><h2>{title}</h2></div>
        <div className="top-actions">{actions}</div>
      </header>
      <section className="screen-content">{children}</section>
    </main>
  )
}
