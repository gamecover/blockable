import { useCallback, useRef, useState } from 'react'

const MAX_LOG_ENTRIES = 100

export function useBattleDebugLog(initialMessage) {
  const nextId = useRef(1)
  const [entries, setEntries] = useState(() => initialMessage
    ? [{ id: 0, message: initialMessage }]
    : [])

  const addLog = useCallback((message) => {
    const entry = { id: nextId.current, message }
    nextId.current += 1
    setEntries((current) => [...current, entry].slice(-MAX_LOG_ENTRIES))
  }, [])

  return { entries, addLog }
}
