import { useCallback, useEffect, useRef, useState } from 'react'
import { useMachine } from '@xstate/react'
import { GameContainer } from './GameContainer.jsx'
import { BattleHud } from './components/BattleHud.jsx'
import { BattleDebugPanel } from './components/BattleDebugPanel.jsx'
import { useBattleDebugLog } from './hooks/useBattleDebugLog.js'
import { battleTurnMachine } from '../../game/machines/battleTurnMachine.js'
import { resolvePlayerTurn } from '../../game/systems/battleSystem.js'
import { addStatus, applyWeakness, applyWound } from '../../game/systems/statusEffectSystem.js'
import {
  applyMonsterEvent,
  applyMonsterTurnTriggers,
  createMonsterBehavior,
  describeMonsterAbility,
  getMonsterDefinition,
  resolveMonsterAbility,
  selectMonsterAbility,
} from '../../game/systems/monsterDesignSystem.js'
import { GAME_EVENTS, gameBridge } from '../../game/events/gameEvents.js'
import { useRunStore, useRunStoreApi } from '../../game/state/runStoreContext.js'

const prepareMonsterTurn = (monster, runtime, turn, health) => {
  const context = { turn, monster_hp_ratio: health / monster.health }
  const triggeredRuntime = applyMonsterTurnTriggers(monster.design, runtime, context)
  return selectMonsterAbility(monster.design, triggeredRuntime, context)
}

export function BattleScreen({ monster, developerMode = false, onWin, onLose, onAbandon }) {
  const monsterDefinition = getMonsterDefinition(monster.designId ?? monster.id)
  if (!monsterDefinition) throw new Error(`몬스터 디자인을 찾을 수 없습니다: ${monster.designId ?? monster.id}`)
  const [machineState, send] = useMachine(battleTurnMachine)
  const [board, setBoard] = useState({
    placedCount: 0,
    occupiedCells: 0,
    totalBoardCells: 15,
    placedBlocks: [],
  })
  const [monsterHealth, setMonsterHealth] = useState(monster.health)
  const [monsterArmor, setMonsterArmor] = useState(0)
  const [monsterStatuses, setMonsterStatuses] = useState([])
  const [turn, setTurn] = useState(1)
  const [monsterTurn, setMonsterTurn] = useState(() =>
    prepareMonsterTurn({ ...monster, design: monsterDefinition }, createMonsterBehavior(monsterDefinition), 1, monster.health))
  const victoryHandled = useRef(false)
  const runStore = useRunStoreApi()
  const { entries: debugEntries, addLog } = useBattleDebugLog(
    `전투 시작 · ${monster.name} HP ${monster.health} · 첫 행동 ${monsterTurn.ability?.display_name ?? '없음'}`,
  )
  const {
    health,
    maxHealth,
    armor,
    gold,
    floor,
    combat,
    battlePiles,
    damagePlayer,
    clearArmor,
    gainArmor,
    heal,
    addGold,
    drawNextHand,
    applyCombatStatus,
    resolvePlayerTurnEndStatuses,
  } = useRunStore()

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
    resolvePlayerTurnEndStatuses(board.placedCount)
    const playerStatuses = runStore.getState().combat.player.statuses
    const rawResult = resolvePlayerTurn(board)
    const weakenedDamage = applyWeakness(rawResult.damage, playerStatuses)
    const result = { ...rawResult, damage: applyWound(weakenedDamage, monsterStatuses) }
    if (result.armor) gainArmor(result.armor)
    if (result.healing) heal(result.healing)
    if (result.gold) addGold(result.gold)
    const absorbed = Math.min(monsterArmor, result.damage)
    const remainingArmor = monsterArmor - absorbed
    const remaining = Math.max(0, monsterHealth - (result.damage - absorbed))
    setMonsterArmor(remainingArmor)
    if (result.statuses.length) {
      setMonsterStatuses((statuses) => result.statuses.reduce(
        (next, status) => addStatus(next, status.id, status.stacks),
        statuses,
      ))
    }
    if (developerMode) {
      const combinationLog = result.combinations.length
        ? ` · 조합 ${result.combinations.join(', ')}`
        : ''
      addLog(`턴 ${turn} 종료 · 피해 ${result.damage} · 방어 ${result.armor} · 회복 ${result.healing}${combinationLog} · 몬스터 HP ${remaining}/${monster.health}`)
      if (result.statuses.length) {
        addLog(`몬스터 상태 부여 · ${result.statuses.map(({ name, id, stacks }) => `${name ?? id} ${stacks}`).join(', ')}`)
      }
      if (result.operations.length) {
        addLog(`아직 사용되지 않은 블록 효과 · ${result.operations.map(({ effect_id: id }) => id).join(', ')}`)
      }
    }
    setMonsterHealth(remaining)
    window.setTimeout(() => {
      if (remaining <= 0) { finishVictory('battle'); return }
      send({ type: 'PLAYER_DONE' })
      window.setTimeout(() => {
        const triggered = applyMonsterEvent(
          monsterDefinition,
          monsterTurn.runtime,
          'ability_used',
          { turn, monster_hp_ratio: remaining / monster.health },
        )
        const action = resolveMonsterAbility({
          effects: [
            ...(monsterTurn.ability?.effects ?? []),
            ...triggered.immediateAbilities.flatMap(({ effects }) => effects),
          ],
        })
        const doubleAttack = monsterStatuses.some(({ id, stacks }) => id === 'doubleAttack' && stacks > 0)
        const actionDamage = action.playerDamage * (doubleAttack ? 2 : 1)
        const before = runStore.getState()
        damagePlayer(actionDamage)
        for (const status of action.playerStatuses) applyCombatStatus('player', status.id, status.stacks)
        const afterDamage = runStore.getState()
        const selfAbsorbed = Math.min(remainingArmor, action.selfDamage)
        const afterSelfDamage = Math.max(0, remaining - (action.selfDamage - selfAbsorbed))
        const afterSelfHealing = Math.min(monster.health, afterSelfDamage + action.selfHealing)
        setMonsterHealth(afterSelfHealing)
        setMonsterArmor(Math.max(0, remainingArmor - selfAbsorbed) + action.selfArmor)
        setMonsterStatuses((statuses) => {
          const consumed = doubleAttack
            ? statuses.map((status) => status.id === 'doubleAttack' ? { ...status, stacks: status.stacks - 1 } : status)
              .filter(({ stacks }) => stacks > 0)
            : statuses
          return [...consumed, ...action.selfStatuses]
        })
        clearArmor()
        if (developerMode) {
          const statusLog = action.playerStatuses.length
            ? ` · 상태 ${action.playerStatuses.map(({ sourceId, stacks }) => `${sourceId} ${stacks}`).join(', ')}`
            : ''
          addLog(`몬스터 행동 ${monsterTurn.ability?.display_name ?? ''} · 피해 ${before.health - afterDamage.health}${statusLog} · 플레이어 HP ${afterDamage.health}/${afterDamage.maxHealth}`)
          if (action.unsupportedStatuses.length) addLog(`미지원 상태 ID: ${action.unsupportedStatuses.join(', ')}`)
        }
        if (afterSelfHealing <= 0) { finishVictory('battle'); return }
        if (afterDamage.health <= 0) { send({ type: 'PLAYER_DEFEATED' }); onLose(); return }
        send({ type: 'MONSTER_DONE' })
        drawNextHand(result.drawCount)
        gameBridge.emit(GAME_EVENTS.RESET_BOARD)
        const nextTurn = turn + 1
        setTurn(nextTurn)
        setMonsterTurn(prepareMonsterTurn(
          { ...monster, design: monsterDefinition },
          triggered.runtime,
          nextTurn,
          afterSelfHealing,
        ))
        if (developerMode) addLog(`턴 ${nextTurn} 준비 · 새 손패 ${5 + result.drawCount}개`)
        window.setTimeout(() => send({ type: 'READY' }), 80)
      }, 550)
    }, 450)
  }, [addGold, addLog, applyCombatStatus, board, clearArmor, damagePlayer, developerMode, drawNextHand, finishVictory, gainArmor, heal, machineState, monster, monsterArmor, monsterDefinition, monsterHealth, monsterStatuses, monsterTurn.ability, monsterTurn.runtime, onLose, resolvePlayerTurnEndStatuses, runStore, send, turn])

  const intent = describeMonsterAbility(monsterTurn.ability)

  return (
    <main className="battle-screen">
      <BattleHud health={health} maxHealth={maxHealth} armor={armor} gold={gold} floor={floor} turn={turn} monster={{ ...monster, currentHealth: monsterHealth, armor: monsterArmor, intent }} placedCount={board.placedCount} playerStatuses={combat.player.statuses} />
      <div className="monster-stage">
        {machineState.matches('monsterAction') && (
          <div className="monster-ability-name" role="status">{monsterTurn.ability?.display_name ?? '기본 공격'}</div>
        )}
        <div className="monster-intent">{intent.icon} {intent.amount ?? intent.label}</div>
        {monster.imageUrl
          ? <img className="monster-image" src={monster.imageUrl} alt={monster.name} />
          : <span className="monster-glyph" aria-label={monster.name}>{monster.glyph}</span>}
        <div className="monster-shadow" />
      </div>
      <GameContainer hand={battlePiles.hand} health={health} />
      {developerMode && <BattleDebugPanel entries={debugEntries} />}
      <div className="battle-controls">
        <button className="text-button" onClick={onAbandon}>전투 포기</button>
        <div><button className="pile-button">남은 블록 <b>{battlePiles.remainingCount ?? battlePiles.drawPile.length + battlePiles.hand.length}</b></button><button className="pile-button">버린 블록 <b>{battlePiles.discardPile.length}</b></button></div>
        <div className="battle-action-buttons">
          {developerMode && <button className="developer-auto-win" type="button" disabled={victoryHandled.current || !machineState.matches('playerInput')} onClick={() => finishVictory('developer')}>자동 승리</button>}
          <button className="end-turn" disabled={!board.placedCount || !machineState.matches('playerInput')} onClick={endTurn}>{machineState.matches('playerInput') ? '턴 종료' : '처리 중…'} <span>→</span></button>
        </div>
      </div>
    </main>
  )
}
