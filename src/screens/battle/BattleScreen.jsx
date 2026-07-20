import { useCallback, useEffect, useState } from 'react'
import { useMachine } from '@xstate/react'
import { GameContainer } from './GameContainer.jsx'
import { BattleHud } from './components/BattleHud.jsx'
import { battleTurnMachine } from '../../game/machines/battleTurnMachine.js'
import { resolvePlayerTurn } from '../../game/systems/battleSystem.js'
import { GAME_EVENTS, gameBridge } from '../../game/events/gameEvents.js'
import { useRunStore } from '../../game/state/useRunStore.js'

export function BattleScreen({ monster, onWin, onLose, onAbandon }) {
  const [machineState, send] = useMachine(battleTurnMachine)
  const [board, setBoard] = useState({ placedCount: 0, occupiedCells: 0, totalBoardCells: 15 })
  const [monsterHealth, setMonsterHealth] = useState(monster.health)
  const [turn, setTurn] = useState(1)
  const { health, maxHealth, armor, gold, floor, battlePiles, damagePlayer, clearArmor, drawNextHand } = useRunStore()

  useEffect(() => gameBridge.on(GAME_EVENTS.BOARD_CHANGED, setBoard), [])

  const endTurn = useCallback(() => {
    if (!board.placedCount || !machineState.matches('playerInput')) return
    send({ type: 'END_TURN' })
    const result = resolvePlayerTurn(board)
    const remaining = Math.max(0, monsterHealth - result.damage)
    setMonsterHealth(remaining)
    window.setTimeout(() => {
      if (remaining <= 0) { send({ type: 'MONSTER_DEFEATED' }); onWin(); return }
      send({ type: 'PLAYER_DONE' })
      window.setTimeout(() => {
        const currentHealth = useRunStore.getState().health
        damagePlayer(monster.damage)
        clearArmor()
        if (currentHealth - monster.damage <= 0) { send({ type: 'PLAYER_DEFEATED' }); onLose(); return }
        send({ type: 'MONSTER_DONE' })
        drawNextHand()
        gameBridge.emit(GAME_EVENTS.RESET_BOARD)
        setTurn((value) => value + 1)
        window.setTimeout(() => send({ type: 'READY' }), 80)
      }, 550)
    }, 450)
  }, [board, clearArmor, damagePlayer, drawNextHand, machineState, monster.damage, monsterHealth, onLose, onWin, send])

  return (
    <main className="battle-screen">
      <BattleHud health={health} maxHealth={maxHealth} armor={armor} gold={gold} floor={floor} turn={turn} monster={{ ...monster, currentHealth: monsterHealth }} placedCount={board.placedCount} />
      <div className="monster-stage"><div className="monster-intent">⚔ {monster.damage}</div><span className="monster-glyph">{monster.glyph}</span><div className="monster-shadow" /></div>
      <GameContainer hand={battlePiles.hand} health={health} />
      <div className="battle-controls">
        <button className="text-button" onClick={onAbandon}>전투 포기</button>
        <div><button className="pile-button">남은 블록 <b>{battlePiles.drawPile.length}</b></button><button className="pile-button">버린 블록 <b>{battlePiles.discardPile.length}</b></button></div>
        <button className="end-turn" disabled={!board.placedCount || !machineState.matches('playerInput')} onClick={endTurn}>{machineState.matches('playerInput') ? '턴 종료' : '처리 중…'} <span>→</span></button>
      </div>
    </main>
  )
}
