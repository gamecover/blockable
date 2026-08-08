import { useState } from 'react'

export function BattleDebugPanel({ entries }) {
  const [open, setOpen] = useState(true)
  const visibleEntries = [...entries]
    .filter(({ message }) => !message.includes('점유 칸'))
    .reverse()

  return (
    <aside className={`battle-debug-panel${open ? ' open' : ''}`} aria-label="전투 로그">
      <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
        <strong>전투 로그</strong>
        <span>{open ? '접기' : `펼치기 (${visibleEntries.length})`}</span>
      </button>
      {open && (
        <ol aria-live="polite">
          {visibleEntries.map((entry) => <li key={entry.id}>{entry.message}</li>)}
        </ol>
      )}
    </aside>
  )
}
