import { useState } from 'react'

export function BattleDebugPanel({ entries }) {
  const [open, setOpen] = useState(true)

  return (
    <aside className={`battle-debug-panel${open ? ' open' : ''}`} aria-label="전투 디버그 로그">
      <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
        <strong>DEV LOG</strong>
        <span>{open ? '접기' : `펼치기 (${entries.length})`}</span>
      </button>
      {open && (
        <ol aria-live="polite">
          {entries.map((entry) => <li key={entry.id}>{entry.message}</li>)}
        </ol>
      )}
    </aside>
  )
}
