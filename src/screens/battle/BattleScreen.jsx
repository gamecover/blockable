import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useMachine } from '@xstate/react'
import { GameContainer } from './GameContainer.jsx'
import { BattleHud } from './components/BattleHud.jsx'
import { BattleDebugPanel } from './components/BattleDebugPanel.jsx'
import { useBattleDebugLog } from './hooks/useBattleDebugLog.js'
import { battleTurnMachine } from '../../game/machines/battleTurnMachine.js'
import { resolvePlayerTurn } from '../../game/systems/battleSystem.js'
import { isCombatVictory } from '../../game/systems/combatSlotSystem.js'
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
  const triggeredRuntime = applyMonsterTurnTriggers(monster.definition, runtime, context)
  return selectMonsterAbility(monster.definition, triggeredRuntime, context)
}

const createCombatant = (monster) => {
  const definition = getMonsterDefinition(monster.designId ?? monster.id)
  if (!definition) throw new Error(`몬스터 디자인을 찾을 수 없습니다: ${monster.designId ?? monster.id}`)
  const base = {
    ...monster,
    instanceId: monster.instanceId ?? `${monster.id}-${monster.slotId ?? 1}`,
    slotId: monster.slotId ?? 1,
    definition,
    currentHealth: monster.health,
    armor: 0,
    statuses: [],
  }
  return {
    ...base,
    turnPlan: prepareMonsterTurn(base, createMonsterBehavior(definition), 1, monster.health),
  }
}

export function BattleScreen({
  monster,
  monsters,
  battleType = 'normal',
  developerMode = false,
  onWin,
  onLose,
  onAbandon,
}) {
  const [machineState, send] = useMachine(battleTurnMachine)
  const [board, setBoard] = useState({
    placedCount: 0,
    occupiedCells: 0,
    totalBoardCells: 15,
    placedBlocks: [],
  })
  const [combatants, setCombatants] = useState(() => (monsters?.length ? monsters : [monster]).map(createCombatant))
  const [selectedMonsterId, setSelectedMonsterId] = useState(() => {
    const initial = monsters?.length ? monsters : [monster]
    return (battleType === 'boss' ? initial.find(({ slotId }) => slotId === 5) : initial[0])?.instanceId
  })
  const [activeMonsterId, setActiveMonsterId] = useState(null)
  const [turn, setTurn] = useState(1)
  const victoryHandled = useRef(false)
  const runStore = useRunStoreApi()
  const selectedMonster = combatants.find(({ instanceId }) => instanceId === selectedMonsterId)
    ?? combatants.find(({ currentHealth }) => currentHealth > 0)
    ?? combatants[0]
  const displayMonster = combatants.find(({ instanceId }) => instanceId === activeMonsterId) ?? selectedMonster
  const { entries: debugEntries, addLog } = useBattleDebugLog(
    `전투 시작 · ${combatants.length}마리 · ${combatants.map(({ slotId, name }) => `${slotId}번 ${name}`).join(', ')}`,
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
    if (source === 'developer') {
      setCombatants((current) => current.map((entry) => ({ ...entry, currentHealth: 0 })))
    }
    send({ type: source === 'developer' ? 'DEBUG_WIN' : 'MONSTER_DEFEATED' })
    if (developerMode) addLog(source === 'developer' ? '자동 승리 실행' : '전투 승리')
    onWin()
  }, [addLog, developerMode, onWin, send])

  const endTurn = useCallback(() => {
    if (!board.placedCount || !machineState.matches('playerInput') || !selectedMonster) return
    send({ type: 'END_TURN' })
    resolvePlayerTurnEndStatuses(board.placedCount)
    const playerStatuses = runStore.getState().combat.player.statuses
    const rawResult = resolvePlayerTurn(board)
    const directDamage = rawResult.damageByTarget?.enemy ?? rawResult.damage
    const areaDamage = rawResult.damageByTarget?.allEnemies ?? 0
    let afterPlayerAction = combatants.map((entry) => {
      if (entry.currentHealth <= 0) return entry
      const rawDamage = areaDamage + (entry.instanceId === selectedMonster.instanceId ? directDamage : 0)
      const receivesStatus = entry.instanceId === selectedMonster.instanceId && rawResult.statuses.length > 0
      if (rawDamage <= 0 && !receivesStatus) return entry
      const damage = applyWound(applyWeakness(rawDamage, playerStatuses), entry.statuses)
      const absorbed = Math.min(entry.armor, damage)
      const statuses = entry.instanceId === selectedMonster.instanceId
        ? rawResult.statuses.reduce(
            (next, status) => addStatus(next, status.id, status.stacks),
            entry.statuses,
          )
        : entry.statuses
      return {
        ...entry,
        armor: entry.armor - absorbed,
        currentHealth: Math.max(0, entry.currentHealth - (damage - absorbed)),
        statuses,
      }
    })
    if (rawResult.armor) gainArmor(rawResult.armor)
    if (rawResult.healing) heal(rawResult.healing)
    if (rawResult.gold) addGold(rawResult.gold)
    setCombatants(afterPlayerAction)
    if (developerMode) {
      const target = afterPlayerAction.find(({ instanceId }) => instanceId === selectedMonster.instanceId)
      addLog(`턴 ${turn} · ${selectedMonster.slotId}번 ${selectedMonster.name}에게 피해 ${directDamage + areaDamage} · HP ${target.currentHealth}/${target.health}`)
    }

    window.setTimeout(() => {
      if (isCombatVictory(battleType, afterPlayerAction)) {
        finishVictory('battle')
        return
      }
      send({ type: 'PLAYER_DONE' })
      window.setTimeout(() => {
        let playerDefeated = false
        afterPlayerAction = [...afterPlayerAction].sort((left, right) => left.slotId - right.slotId)
          .map((entry) => {
            if (entry.currentHealth <= 0 || playerDefeated) return entry
            setActiveMonsterId(entry.instanceId)
            const triggered = applyMonsterEvent(
              entry.definition,
              entry.turnPlan.runtime,
              'ability_used',
              { turn, monster_hp_ratio: entry.currentHealth / entry.health },
            )
            const action = resolveMonsterAbility({
              effects: [
                ...(entry.turnPlan.ability?.effects ?? []),
                ...triggered.immediateAbilities.flatMap(({ effects }) => effects),
              ],
            })
            const doubleAttack = entry.statuses.some(({ id, stacks }) => id === 'doubleAttack' && stacks > 0)
            const before = runStore.getState()
            damagePlayer(action.playerDamage * (doubleAttack ? 2 : 1))
            action.playerStatuses.forEach((status) => applyCombatStatus('player', status.id, status.stacks))
            const after = runStore.getState()
            if (developerMode) {
              addLog(`${entry.slotId}번 ${entry.name} · ${entry.turnPlan.ability?.display_name ?? '행동'} · 피해 ${before.health - after.health}`)
            }
            playerDefeated = after.health <= 0
            const selfAbsorbed = Math.min(entry.armor, action.selfDamage)
            const statuses = [
              ...(doubleAttack
                ? entry.statuses.map((status) => status.id === 'doubleAttack'
                  ? { ...status, stacks: status.stacks - 1 }
                  : status).filter(({ stacks }) => stacks > 0)
                : entry.statuses),
              ...action.selfStatuses,
            ]
            return {
              ...entry,
              currentHealth: Math.min(entry.health, Math.max(0,
                entry.currentHealth - (action.selfDamage - selfAbsorbed)) + action.selfHealing),
              armor: Math.max(0, entry.armor - selfAbsorbed) + action.selfArmor,
              statuses,
              turnPlan: { ...entry.turnPlan, runtime: triggered.runtime },
            }
          })
        setCombatants(afterPlayerAction)
        clearArmor()
        setActiveMonsterId(null)
        if (playerDefeated) {
          send({ type: 'PLAYER_DEFEATED' })
          onLose()
          return
        }
        if (isCombatVictory(battleType, afterPlayerAction)) {
          finishVictory('battle')
          return
        }
        const nextTurn = turn + 1
        const planned = afterPlayerAction.map((entry) => entry.currentHealth > 0
          ? {
              ...entry,
              turnPlan: prepareMonsterTurn(entry, entry.turnPlan.runtime, nextTurn, entry.currentHealth),
            }
          : entry)
        setCombatants(planned)
        const selectedAlive = planned.some(({ instanceId, currentHealth }) =>
          instanceId === selectedMonsterId && currentHealth > 0)
        if (!selectedAlive) {
          setSelectedMonsterId((battleType === 'boss'
            ? planned.find(({ slotId, currentHealth }) => slotId === 5 && currentHealth > 0)
            : planned.find(({ currentHealth }) => currentHealth > 0))?.instanceId)
        }
        send({ type: 'MONSTER_DONE' })
        drawNextHand(rawResult.drawCount)
        gameBridge.emit(GAME_EVENTS.RESET_BOARD)
        setTurn(nextTurn)
        window.setTimeout(() => send({ type: 'READY' }), 80)
      }, 550)
    }, 450)
  }, [addGold, addLog, applyCombatStatus, battleType, board, clearArmor, combatants, damagePlayer, developerMode, drawNextHand, finishVictory, gainArmor, heal, machineState, onLose, resolvePlayerTurnEndStatuses, runStore, selectedMonster, selectedMonsterId, send, turn])

  const intent = describeMonsterAbility(displayMonster?.turnPlan.ability)
  const livingCombatants = useMemo(() => combatants.filter(({ currentHealth }) => currentHealth > 0), [combatants])

  return (
    <main className="battle-screen">
      <BattleHud
        health={health}
        maxHealth={maxHealth}
        armor={armor}
        gold={gold}
        floor={floor}
        turn={turn}
        monster={{ ...displayMonster, intent }}
        placedCount={board.placedCount}
        playerStatuses={combat.player.statuses}
      />
      <div className={`monster-slots monster-slots--${battleType}`} aria-label="몬스터 전투 슬롯">
        {combatants.map((entry) => {
          const slotIntent = describeMonsterAbility(entry.turnPlan.ability)
          return (
            <button
              type="button"
              key={entry.instanceId}
              className={`monster-slot slot-${entry.slotId}${entry.instanceId === selectedMonsterId ? ' selected' : ''}${entry.currentHealth <= 0 ? ' dead' : ''}`}
              disabled={entry.currentHealth <= 0 || !machineState.matches('playerInput')}
              onClick={() => setSelectedMonsterId(entry.instanceId)}
            >
              <b>{entry.slotId}</b>
              <span>{entry.name}</span>
              <small>♥ {entry.currentHealth}/{entry.health} · {slotIntent.icon} {slotIntent.amount ?? slotIntent.label}</small>
            </button>
          )
        })}
      </div>
      <div className="monster-stage">
        {machineState.matches('monsterAction') && (
          <div className="monster-ability-name" role="status">{displayMonster?.turnPlan.ability?.display_name ?? '기본 공격'}</div>
        )}
        <div className="monster-intent">{intent.icon} {intent.amount ?? intent.label}</div>
        {displayMonster?.imageUrl
          ? <img className="monster-image" src={displayMonster.imageUrl} alt={displayMonster.name} />
          : <span className="monster-glyph" aria-label={displayMonster?.name}>{displayMonster?.glyph}</span>}
        <div className="monster-shadow" />
      </div>
      <GameContainer hand={battlePiles.hand} health={health} />
      {developerMode && <BattleDebugPanel entries={debugEntries} />}
      <div className="battle-controls">
        <button className="text-button" onClick={onAbandon}>전투 포기</button>
        <div><button className="pile-button">남은 블록 <b>{battlePiles.remainingCount ?? battlePiles.drawPile.length + battlePiles.hand.length}</b></button><button className="pile-button">버린 블록 <b>{battlePiles.discardPile.length}</b></button></div>
        <div className="battle-action-buttons">
          {developerMode && <button className="developer-auto-win" type="button" disabled={victoryHandled.current || !machineState.matches('playerInput')} onClick={() => finishVictory('developer')}>자동 승리</button>}
          <button className="end-turn" disabled={!board.placedCount || !livingCombatants.length || !machineState.matches('playerInput')} onClick={endTurn}>{machineState.matches('playerInput') ? '턴 종료' : '처리 중…'} <span>→</span></button>
        </div>
      </div>
    </main>
  )
}
