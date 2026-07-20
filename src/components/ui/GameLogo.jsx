export function GameLogo({ compact = false }) {
  return (
    <div className={`game-logo ${compact ? 'compact' : ''}`}>
      <span className="logo-rivet">◆</span>
      <h1>BLOCKABLE<span>!</span></h1>
      <p>FORGE · PLACE · CONQUER</p>
    </div>
  )
}
