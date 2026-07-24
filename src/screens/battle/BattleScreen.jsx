import { useCallback, useEffect, useRef, useState } from 'react'
import { useMachine } from '@xstate/react'
import { GameContainer } from './GameContainer.jsx'
import { BattleHud } from './components/BattleHud.jsx'
import { BattleDebugPanel } from './components/BattleDebugPanel.jsx'
import { useBattleDebugLog } from './hooks/useBattleDebugLog.js'
import { battleTurnMachine } from '../../game/machines/battleTurnMachine.js'
import { resolvePlayerTurn } from '../../game/systems/battleSystem.js'
import { GAME_EVENTS, gameBridge } from '../../game/events/gameEvents.js'
import { useRunStore, useRunStoreApi } from '../../game/state/runStoreContext.js'

export function BattleScreen({ monster, developerMode = false, onWin, onLose, onAbandon }) {
  const [machineState, send] = useMachine(battleTurnMachine)
  const [board, setBoard] = useState({ placedCount: 0, occupiedCells: 0, totalBoardCells: 15 })
  const [monsterHealth, setMonsterHealth] = useState(monster.health)
  const [turn, setTurn] = useState(1)
  const victoryHandled = useRef(false)
  const runStore = useRunStoreApi()
  const { entries: debugEntries, addLog } = useBattleDebugLog(
    `전투 시작 · ${monster.name} HP ${monster.health} · 공격 ${monster.damage}`,
  )
  const { health, maxHealth, armor, gold, floor, battlePiles, damagePlayer, clearArmor, drawNextHand } = useRunStore()

  useEffect(() => gameBridge.on(GAME_EVENTS.BOARD_CHANGED, (nextBoard) => {
    setBoard(nextBoard)
    if (developerMode) addLog(`블록 배치 ${nextBoard.placedCount}/3 · 점유 칸 ${nextBoard.occupiedCells}/${nextBoard.totalBoardCells}`)
  }), [addLog, developerMode])

  const finishVictory = useCallback((source) => {
    if (victoryHandled.current) return
    victoryHandled.current = true
    setMonsterHealth(0)
    send({ type: source === 'developer' ? 'DEBUG_WIN' : 'MONSTER_DEFEATED' })
    if (developerMode) addLog(source === 'developer' ? '자동 승리 실행' : '몬스터 처치')
    onWin()
  }, [addLog, developerMode, onWin, send])

  const endTurn = useCallback(() => {
    if (!board.placedCount || !machineState.matches('playerInput')) return
    send({ type: 'END_TURN' })
    const result = resolvePlayerTurn(board)
    const remaining = Math.max(0, monsterHealth - result.damage)
    if (developerMode) addLog(`턴 ${turn} 종료 · 피해 ${result.damage} · 몬스터 HP ${remaining}/${monster.health}`)
    setMonsterHealth(remaining)
    window.setTimeout(() => {
      if (remaining <= 0) { finishVictory('battle'); return }
      send({ type: 'PLAYER_DONE' })
      window.setTimeout(() => {
        const before = runStore.getState()
        damagePlayer(monster.damage)
        const afterDamage = runStore.getState()
        clearArmor()
        if (developerMode) addLog(`몬스터 행동 · 피해 ${before.health - afterDamage.health} · 플레이어 HP ${afterDamage.health}/${afterDamage.maxHealth}`)
        if (afterDamage.health <= 0) { send({ type: 'PLAYER_DEFEATED' }); onLose(); return }
        send({ type: 'MONSTER_DONE' })
        drawNextHand()
        gameBridge.emit(GAME_EVENTS.RESET_BOARD)
        setTurn((value) => value + 1)
        if (developerMode) addLog(`턴 ${turn + 1} 준비 · 새 손패 5개`)
        window.setTimeout(() => send({ type: 'READY' }), 80)
      }, 550)
    }, 450)
  }, [addLog, board, clearArmor, damagePlayer, developerMode, drawNextHand, finishVictory, machineState, monster.damage, monster.health, monsterHealth, onLose, runStore, send, turn])

  return (
    <main className="battle-screen">
      <BattleHud health={health} maxHealth={maxHealth} armor={armor} gold={gold} floor={floor} turn={turn} monster={{ ...monster, currentHealth: monsterHealth }} placedCount={board.placedCount} />
      <div className="monster-stage"><div className="monster-intent">⚔ {monster.damage}</div><span className="monster-glyph">{monster.glyph}</span><div className="monster-shadow" /></div>
      <GameContainer hand={battlePiles.hand} health={health} />
      {developerMode && <BattleDebugPanel entries={debugEntries} />}
      <div className="battle-controls">
        <button className="text-button" onClick={onAbandon}>전투 포기</button>
        <div><button className="pile-button">남은 블록 <b>{battlePiles.drawPile.length}</b></button><button className="pile-button">버린 블록 <b>{battlePiles.discardPile.length}</b></button></div>
        <div className="battle-action-buttons">
          {developerMode && <button className="developer-auto-win" type="button" disabled={victoryHandled.current || !machineState.matches('playerInput')} onClick={() => finishVictory('developer')}>자동 승리</button>}
          <button className="end-turn" disabled={!board.placedCount || !machineState.matches('playerInput')} onClick={endTurn}>{machineState.matches('playerInput') ? '턴 종료' : '처리 중…'} <span>→</span></button>
        </div>
      </div>
    </main>
  )
}
