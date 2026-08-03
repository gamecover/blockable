import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useMachine } from '@xstate/react'
import { GameContainer } from './GameContainer.jsx'
import { BattleHud } from './components/BattleHud.jsx'
import { BattleDebugPanel } from './components/BattleDebugPanel.jsx'
import { QuickBlueprintPanel } from './components/QuickBlueprintPanel.jsx'
import { StatusEffectList } from './components/StatusEffectList.jsx'
import { BattlePileModal } from './components/BattlePileModal.jsx'
import { MonsterPartyFrame } from './components/MonsterPartyFrame.jsx'
import { TutorialOverlay } from '../tutorial/TutorialOverlay.jsx'
import { useBattleDebugLog } from './hooks/useBattleDebugLog.js'
import { battleTurnMachine } from '../../game/machines/battleTurnMachine.js'
import { resolvePlayerTurn } from '../../game/systems/battleSystem.js'
import { isCombatVictory } from '../../game/systems/combatSlotSystem.js'
import {
  addStatusUpdate,
  consumeStun,
  getHitCountBonus,
  resolveTurnEndStatuses,
} from '../../game/systems/statusEffectSystem.js'
import {
  getPlayerTargetSlotIds,
  resolvePlayerAction,
} from '../../game/systems/playerAttackSystem.js'
import { BLOCK_RULE_INDEX } from '../../game/systems/blockRulesSystem.js'
import { getKnownBlueprints, isStarterBlueprint } from '../../game/systems/blueprintSystem.js'
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
import ashenFurnaceBackground from '../../assets/pictures/backgrounds/Ash_furance_alpha.png'
import floodedFoundryBackground from '../../assets/pictures/backgrounds/flooded_foundry_alpha.png'

const prepareMonsterTurn = (monster, runtime, turn, health) => {
  const context = { turn, monster_hp_ratio: health / monster.health }
  const triggeredRuntime = applyMonsterTurnTriggers(monster.definition, runtime, context)
  return selectMonsterAbility(monster.definition, triggeredRuntime, context)
}

const waitForPresentation = (milliseconds) =>
  new Promise((resolve) => window.setTimeout(resolve, milliseconds))

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
  dungeonId,
  developerMode = false,
  onWin,
  onLose,
  onAbandon,
  tutorialMode = false,
  onTutorialSkip,
}) {
  const [machineState, send] = useMachine(battleTurnMachine)
  const [board, setBoard] = useState({
    placedCount: 0,
    placementLimit: 3,
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
  const [monsterActionNotice, setMonsterActionNotice] = useState(null)
  const [tutorialFreeCombat, setTutorialFreeCombat] = useState(false)
  const [tutorialVictory, setTutorialVictory] = useState(false)
  const [tutorialExitConfirmOpen, setTutorialExitConfirmOpen] = useState(false)
  const [blueprintNotice, setBlueprintNotice] = useState([])
  const [openPile, setOpenPile] = useState(null)
  const [turn, setTurn] = useState(1)
  const victoryHandled = useRef(false)
  const tutorialVictoryTimer = useRef(null)
  const extraTurnsRemaining = useRef(0)
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
    gainArmor,
    retainArmorNextTurn,
    resolveArmorTurnEnd,
    heal,
    addGold,
    drawNextHand,
    applyCombatStatus,
    consumeCombatStatus,
    resolvePlayerTurnEndStatuses,
    discoverBlueprints,
    discoveredBlueprintIds,
  } = useRunStore()
  const playerStunned = combat.player.statuses.some(({ id, stacks }) =>
    id === 'stun' && stacks > 0)
  const knownBlueprintIds = useMemo(
    () => getKnownBlueprints(discoveredBlueprintIds).map(({ id }) => id),
    [discoveredBlueprintIds],
  )

  useEffect(() => gameBridge.on(GAME_EVENTS.BOARD_CHANGED, (nextBoard) => {
    setBoard(nextBoard)
    if (developerMode) addLog(`블록 배치 ${nextBoard.placedCount}/3 · 점유 칸 ${nextBoard.occupiedCells}/${nextBoard.totalBoardCells}`)
  }), [addLog, developerMode])

  useEffect(() => gameBridge.on(GAME_EVENTS.TUTORIAL_ACTION, ({ type }) => {
    if (!tutorialMode || type !== 'free-combat-started') return
    setTutorialFreeCombat(true)
    drawNextHand(0, true)
    gameBridge.emit(GAME_EVENTS.RESET_BOARD)
  }), [drawNextHand, tutorialMode])

  useEffect(() => {
    if (!blueprintNotice.length) return undefined
    const timeoutId = window.setTimeout(() => setBlueprintNotice([]), 3600)
    return () => window.clearTimeout(timeoutId)
  }, [blueprintNotice])

  useEffect(() => () => {
    if (tutorialVictoryTimer.current !== null) {
      window.clearTimeout(tutorialVictoryTimer.current)
    }
  }, [])

  const finishVictory = useCallback((source) => {
    if (victoryHandled.current) return
    victoryHandled.current = true
    if (source === 'developer') {
      setCombatants((current) => current.map((entry) => ({ ...entry, currentHealth: 0 })))
    }
    send({ type: source === 'developer' ? 'DEBUG_WIN' : 'MONSTER_DEFEATED' })
    if (developerMode) addLog(source === 'developer' ? '자동 승리 실행' : '전투 승리')
    if (tutorialMode) {
      setTutorialVictory(true)
      tutorialVictoryTimer.current = window.setTimeout(onWin, 2800)
      return
    }
    onWin()
  }, [addLog, developerMode, onWin, send, tutorialMode])

  const endTurn = useCallback(() => {
    const currentPlayerStatuses = runStore.getState().combat.player.statuses
    const stunned = currentPlayerStatuses.some(({ id, stacks }) => id === 'stun' && stacks > 0)
    if ((!board.placedCount && !stunned)
      || !machineState.matches('playerInput')
      || !selectedMonster) return
    send({ type: 'END_TURN' })
    const playerStatuses = currentPlayerStatuses
    const rawResult = stunned
      ? resolvePlayerTurn({ placedBlocks: [], occupiedCells: 0, totalBoardCells: board.totalBoardCells, currentArmor: armor })
      : resolvePlayerTurn({ ...board, currentArmor: armor })
    if (stunned) {
      consumeCombatStatus('player', 'stun')
      if (developerMode) addLog('플레이어 · 기절로 행동 취소')
    }
    if (rawResult.combinations.length) {
      const previouslyDiscovered = new Set(discoveredBlueprintIds)
      const newlyDiscovered = rawResult.combinations
        .map((id) => BLOCK_RULE_INDEX.combinations.get(id))
        .filter((combination) =>
          combination
          && !isStarterBlueprint(combination)
          && !previouslyDiscovered.has(combination.id))
      if (newlyDiscovered.length) {
        setBlueprintNotice(newlyDiscovered.map(({ display_name: name }) => name))
      }
      discoverBlueprints(rawResult.combinations)
    }
    const playerAction = resolvePlayerAction({
      combatants,
      selectedMonsterId: selectedMonster.instanceId,
      battleType,
      effects: rawResult,
      playerStatuses,
    })
    if (getHitCountBonus(playerStatuses) > 0) {
      consumeCombatStatus('player', 'double_attack')
    }
    let afterPlayerAction = playerAction.combatants
    if (rawResult.armor) gainArmor(rawResult.armor)
    if (rawResult.retainArmorNextTurn) retainArmorNextTurn()
    if (rawResult.healing) heal(rawResult.healing)
    if (rawResult.gold) addGold(rawResult.gold)
    rawResult.playerStatuses.forEach((status) => {
      applyCombatStatus('player', status, undefined, true)
      if (status.id === 'ironclad') gainArmor(status.stacks)
    })
    setCombatants(afterPlayerAction)
    if (developerMode) {
      const target = afterPlayerAction.find(({ instanceId }) => instanceId === selectedMonster.instanceId)
      addLog(`턴 ${turn} · 기본 ${playerAction.baseAttackPerHit}×${playerAction.hitCount} · 독립 ${playerAction.independentDamage} · ${selectedMonster.slotId}번 피해 ${playerAction.damageBySlot.get(selectedMonster.slotId) ?? 0} · HP ${target.currentHealth}/${target.health}`)
    }

    window.setTimeout(() => {
      if (isCombatVictory(battleType, afterPlayerAction)) {
        finishVictory('battle')
        return
      }
      extraTurnsRemaining.current += Math.max(0, rawResult.extraTurns)
      const hasExtraTurn = extraTurnsRemaining.current > 0
      if (hasExtraTurn) extraTurnsRemaining.current -= 1
      if (!hasExtraTurn) {
        const nextActingMonster = [...afterPlayerAction]
          .sort((left, right) => left.slotId - right.slotId)
          .find(({ currentHealth }) => currentHealth > 0)
        if (nextActingMonster) {
          const stunned = nextActingMonster.statuses.some(({ id, stacks }) =>
            id === 'stun' && stacks > 0)
          setMonsterActionNotice({
            slotId: nextActingMonster.slotId,
            abilityName: stunned
              ? '기절 · 행동 취소'
              : nextActingMonster.turnPlan.ability?.display_name ?? '기본 공격',
            cancelled: stunned,
          })
        }
      }
      send({ type: hasExtraTurn ? 'PLAYER_EXTRA' : 'PLAYER_DONE' })
      window.setTimeout(async () => {
        let playerDefeated = false
        if (!hasExtraTurn) {
          const actingOrder = [...afterPlayerAction]
            .filter(({ currentHealth }) => currentHealth > 0)
            .sort((left, right) => left.slotId - right.slotId)
          for (let index = 0; index < actingOrder.length; index += 1) {
            const entry = afterPlayerAction.find(({ instanceId }) =>
              instanceId === actingOrder[index].instanceId)
            if (!entry || entry.currentHealth <= 0 || playerDefeated) continue
            const stun = consumeStun(entry.statuses)
            setActiveMonsterId(entry.instanceId)
            setMonsterActionNotice({
              slotId: entry.slotId,
              abilityName: stun.skipAction
                ? '기절 · 행동 취소'
                : entry.turnPlan.ability?.display_name ?? '기본 공격',
              cancelled: stun.skipAction,
            })
            await waitForPresentation(stun.skipAction ? 400 : 300)
            if (stun.skipAction) {
              if (developerMode) addLog(`${entry.slotId}번 ${entry.name} · 기절로 행동 취소`)
              afterPlayerAction = afterPlayerAction.map((candidate) =>
                candidate.instanceId === entry.instanceId
                  ? { ...candidate, statuses: stun.statuses }
                  : candidate)
              setCombatants(afterPlayerAction)
              continue
            }
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
            const hitCountBonus = getHitCountBonus(entry.statuses)
            const doubleAttack = hitCountBonus > 0
            const before = runStore.getState()
            const monsterHitCount = 1 + hitCountBonus
            const monsterActionCount = 1 + action.extraTurns
            for (let hit = 0; hit < monsterHitCount * monsterActionCount; hit += 1) {
              damagePlayer(action.playerBaseDamage, entry.statuses)
            }
            action.playerBaseHitAttacks.forEach((attack) => {
              const hitCount = (attack.hitCount + hitCountBonus) * monsterActionCount
              for (let hit = 0; hit < hitCount; hit += 1) {
                damagePlayer(attack.value, entry.statuses)
              }
            })
            if (action.playerIndependentDamage) {
              for (let actionIndex = 0; actionIndex < monsterActionCount; actionIndex += 1) {
                damagePlayer(action.playerIndependentDamage, entry.statuses)
              }
            }
            for (let actionIndex = 0; actionIndex < monsterActionCount; actionIndex += 1) {
              action.playerStatuses.forEach((status) =>
                applyCombatStatus('player', status, undefined, true))
            }
            const after = runStore.getState()
            if (developerMode) {
              addLog(`${entry.slotId}번 ${entry.name} · ${entry.turnPlan.ability?.display_name ?? '행동'} · 피해 ${before.health - after.health}`)
            }
            playerDefeated = after.health <= 0
            const selfBaseDamage = action.selfBaseDamage * monsterHitCount * monsterActionCount
              + action.selfBaseHitAttacks.reduce((sum, attack) =>
                sum + attack.value * (attack.hitCount + hitCountBonus) * monsterActionCount, 0)
            const resolvedSelfDamage = selfBaseDamage
              + action.selfIndependentDamage * monsterActionCount
            const selfAbsorbed = Math.min(entry.armor, resolvedSelfDamage)
            const existingStatuses = doubleAttack
              ? entry.statuses.filter(({ id }) => id !== 'double_attack')
              : entry.statuses
            let statuses = existingStatuses
            for (let actionIndex = 0; actionIndex < monsterActionCount; actionIndex += 1) {
              statuses = action.selfStatuses.reduce(
                (current, status) => addStatusUpdate(current, status, true),
                statuses,
              )
            }
            const resolvedEntry = {
              ...entry,
              currentHealth: Math.min(entry.health, Math.max(0,
                entry.currentHealth - (resolvedSelfDamage - selfAbsorbed))
                + action.selfHealing * monsterActionCount),
              armor: Math.max(0, entry.armor - selfAbsorbed)
                + action.selfArmor * monsterActionCount
                + action.selfStatuses
                  .filter(({ id }) => id === 'ironclad')
                  .reduce((sum, status) =>
                    sum + status.stacks * monsterActionCount, 0),
              statuses,
              turnPlan: { ...entry.turnPlan, runtime: triggered.runtime },
            }
            afterPlayerAction = afterPlayerAction.map((candidate) =>
              candidate.instanceId === entry.instanceId ? resolvedEntry : candidate)
            setCombatants(afterPlayerAction)
            await waitForPresentation(320)
            if (!playerDefeated && index < actingOrder.length - 1) {
              await waitForPresentation(180)
            }
          }
        }
        setCombatants(afterPlayerAction)
        setActiveMonsterId(null)
        setMonsterActionNotice(null)
        if (playerDefeated) {
          send({ type: 'PLAYER_DEFEATED' })
          onLose()
          return
        }
        if (battleType === 'boss' && isCombatVictory(battleType, afterPlayerAction)) {
          finishVictory('battle')
          return
        }
        resolvePlayerTurnEndStatuses(board.placedCount)
        const afterPlayerStatuses = runStore.getState()
        if (afterPlayerStatuses.health <= 0) {
          send({ type: 'PLAYER_DEFEATED' })
          onLose()
          return
        }
        const statusResolvedCombatants = []
        let bossDefeatedByStatus = false
        for (const entry of [...afterPlayerAction].sort((left, right) => left.slotId - right.slotId)) {
          if (entry.currentHealth <= 0 || bossDefeatedByStatus) {
            statusResolvedCombatants.push(entry)
            continue
          }
          const resolved = resolveTurnEndStatuses({
            health: entry.currentHealth,
            armor: entry.armor,
            statuses: entry.statuses,
            placedBlockCount: board.placedCount,
          })
          const nextEntry = {
            ...entry,
            currentHealth: resolved.health,
            armor: resolved.armor,
            statuses: resolved.statuses,
          }
          statusResolvedCombatants.push(nextEntry)
          bossDefeatedByStatus = battleType === 'boss' && entry.slotId === 5 && resolved.health <= 0
        }
        afterPlayerAction = statusResolvedCombatants
        setCombatants(afterPlayerAction)
        if (bossDefeatedByStatus || isCombatVictory(battleType, afterPlayerAction)) {
          finishVictory('battle')
          return
        }
        resolveArmorTurnEnd()
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
        send({ type: hasExtraTurn ? 'TURN_ENDED' : 'MONSTER_DONE' })
        drawNextHand(rawResult.drawCount, tutorialMode && tutorialFreeCombat)
        gameBridge.emit(GAME_EVENTS.RESET_BOARD)
        setTurn(nextTurn)
        window.setTimeout(() => send({ type: 'READY' }), 80)
      }, 550)
    }, 450)
  }, [addGold, addLog, applyCombatStatus, armor, battleType, board, combatants, consumeCombatStatus, damagePlayer, developerMode, discoverBlueprints, discoveredBlueprintIds, drawNextHand, finishVictory, gainArmor, heal, machineState, onLose, resolveArmorTurnEnd, resolvePlayerTurnEndStatuses, retainArmorNextTurn, runStore, selectedMonster, selectedMonsterId, send, turn, tutorialFreeCombat, tutorialMode])

  const intent = describeMonsterAbility(displayMonster?.turnPlan.ability)
  const livingCombatants = useMemo(() => combatants.filter(({ currentHealth }) => currentHealth > 0), [combatants])
  const previewEffects = useMemo(() => resolvePlayerTurn(board), [board])
  const previewTargetSlotIds = useMemo(() => getPlayerTargetSlotIds({
    combatants,
    selectedMonsterId,
    battleType,
    effects: previewEffects,
  }), [battleType, combatants, previewEffects, selectedMonsterId])
  const monsterFormation = useMemo(() => {
    const focusId = activeMonsterId ?? selectedMonsterId
    const normalMonsters = [...combatants]
      .filter(({ slotId }) => slotId !== 5)
      .sort((left, right) => left.slotId - right.slotId)
    const focusedNormal = normalMonsters.find(({ instanceId }) => instanceId === focusId)
    const backgroundMonsters = focusedNormal
      ? normalMonsters.filter(({ instanceId }) => instanceId !== focusId)
      : normalMonsters
    const backgroundLayouts = {
      1: [50],
      2: [40, 60],
      3: [30, 50, 70],
      4: [20, 40, 60, 80],
    }
    const positions = new Map()
    backgroundMonsters.forEach((entry, index) => {
      positions.set(entry.instanceId, {
        role: 'background',
        left: backgroundLayouts[backgroundMonsters.length]?.[index] ?? 42,
        bottom: 62,
        width: 16,
      })
    })
    if (focusedNormal) {
      positions.set(focusedNormal.instanceId, {
        role: 'foreground',
        left: 48,
        bottom: 0,
        width: 20,
      })
    }
    combatants.filter(({ slotId }) => slotId === 5).forEach((entry) => {
      const focused = entry.instanceId === focusId
      positions.set(entry.instanceId, focused
        ? { role: 'foreground boss-focus', left: 48, bottom: 16, width: 20 }
        : { role: 'boss-rear', left: 50, bottom: 72, width: 16 })
    })
    return positions
  }, [activeMonsterId, combatants, selectedMonsterId])
  const battleBackground = dungeonId === 'ashen-forge-west'
    ? floodedFoundryBackground
    : ashenFurnaceBackground

  return (
    <main
      className="battle-screen"
      style={{ '--battle-background-image': `url("${battleBackground}")` }}
    >
      <BattleHud
        health={health}
        maxHealth={maxHealth}
        armor={armor}
        gold={gold}
        floor={floor}
        turn={turn}
        monster={{ ...displayMonster, intent }}
        placedCount={board.placedCount}
        placementLimit={board.placementLimit}
        playerStatuses={combat.player.statuses}
      />
      <div data-tutorial-target="monsters" className={`monster-slots monster-slots--${battleType} monster-slots--selected-${selectedMonster?.slotId ?? 'none'}`} aria-label="몬스터 전투 슬롯">
        {combatants.map((entry) => {
          const slotIntent = describeMonsterAbility(entry.turnPlan.ability)
          const selected = entry.instanceId === selectedMonsterId
          const inRange = previewTargetSlotIds.includes(entry.slotId)
          const acting = entry.instanceId === activeMonsterId
          const formation = monsterFormation.get(entry.instanceId)
          return (
            <button
              type="button"
              key={entry.instanceId}
              className={`monster-slot slot-${entry.slotId} formation-${formation?.role ?? 'background'}${selected ? ' selected' : ''}${inRange ? ' in-range' : ''}${acting ? ' acting' : ''}${acting && !monsterActionNotice?.cancelled ? ' attacking' : ''}${entry.currentHealth <= 0 ? ' dead' : ''}`}
              style={{
                left: `${formation?.left ?? 42}%`,
                bottom: `${formation?.bottom ?? 35}%`,
                width: `${formation?.width ?? 16}%`,
              }}
              disabled={entry.currentHealth <= 0 || !machineState.matches('playerInput')}
              onClick={() => {
                setSelectedMonsterId(entry.instanceId)
                if (tutorialMode) gameBridge.emit(GAME_EVENTS.TUTORIAL_ACTION, { type: 'monster-selected' })
              }}
              aria-label={`${entry.slotId}번 ${entry.name}, 체력 ${entry.currentHealth}/${entry.health}, ${selected ? '현재 공격 대상' : inRange ? '범위 공격 대상' : ''}`}
            >
              <b className="monster-slot__number">{entry.slotId}</b>
              {slotIntent.indicators.length > 0 && (
                <span className="monster-slot__intent" aria-label={`${entry.name} 다음 행동`}>
                  {slotIntent.indicators.map((indicator) => (
                    <span className={`monster-slot__intent-item ${indicator.kind}`} key={indicator.kind} title={`${indicator.label} ${indicator.amount}`}>
                      <i aria-hidden="true">{indicator.icon}</i>
                      <b>{indicator.amount}</b>
                    </span>
                  ))}
                </span>
              )}
              <span className="monster-slot__portrait">
                {entry.imageUrl
                  ? <img src={entry.imageUrl} alt="" />
                  : <i aria-hidden="true">{entry.glyph}</i>}
              </span>
              <span className="monster-slot__details">
                <span className="monster-slot__name">{entry.name}</span>
                <span className="monster-slot__health">
                  <i style={{ width: `${Math.max(0, entry.currentHealth / entry.health) * 100}%` }} />
                </span>
                <StatusEffectList statuses={entry.statuses} ownerName={entry.name} />
                {selected && <em>중심 대상</em>}
                {!selected && inRange && <em>범위 대상</em>}
              </span>
            </button>
          )
        })}
      </div>
      <MonsterPartyFrame
        combatants={combatants}
        selectedMonsterId={selectedMonsterId}
        activeMonsterId={activeMonsterId}
        targetSlotIds={previewTargetSlotIds}
        canSelect={machineState.matches('playerInput')}
        onSelect={setSelectedMonsterId}
      />
      {machineState.matches('playerInput') && (
        <QuickBlueprintPanel
          hand={battlePiles.hand}
          placedBlocks={board.placedBlocks}
          discoveredBlueprintIds={discoveredBlueprintIds}
          allowedCombinationIds={tutorialMode && !tutorialFreeCombat ? ['base_33_01'] : null}
        />
      )}
      {blueprintNotice.length > 0 && (
        <div className="blueprint-discovery" role="status" aria-live="polite">
          <b>새로운 조합 발견</b>
          <strong>{blueprintNotice.join(', ')}</strong>
          <span>이제 청사진에서 확인할 수 있습니다.</span>
          <button type="button" onClick={() => setBlueprintNotice([])} aria-label="조합 발견 알림 닫기">×</button>
        </div>
      )}
      <div className="monster-stage">
        {machineState.matches('monsterAction') && monsterActionNotice && (
          <div className={`monster-ability-name${monsterActionNotice.cancelled ? ' cancelled' : ''}`} role="status">
            <b>{monsterActionNotice.slotId}번 몬스터 행동</b>
            <span>{monsterActionNotice.abilityName}</span>
          </div>
        )}
        {displayMonster?.imageUrl
          ? <img className="monster-image" src={displayMonster.imageUrl} alt={displayMonster.name} />
          : <span className="monster-glyph" aria-label={displayMonster?.name}>{displayMonster?.glyph}</span>}
        <div className="monster-shadow" />
      </div>
      <GameContainer
        hand={battlePiles.hand}
        health={health}
        armor={armor}
        playerStatuses={combat.player.statuses}
        targetStatuses={selectedMonster?.statuses ?? []}
        developerMode={developerMode}
        tutorialMode={tutorialMode}
        knownBlueprintIds={knownBlueprintIds}
      />
      {developerMode && <BattleDebugPanel entries={debugEntries} />}
      <div className="battle-controls">
        <button className="text-button" onClick={onAbandon}>전투 포기</button>
        <div data-tutorial-target="piles"><button className="pile-button" type="button" onClick={() => setOpenPile('remaining')}>남은 블록 <b>{battlePiles.drawPile.length}</b></button><button className="pile-button" type="button" onClick={() => setOpenPile('discard')}>버린 블록 <b>{battlePiles.discardPile.length}</b></button></div>
        <div className="battle-action-buttons">
          {developerMode && <button className="developer-auto-win" type="button" disabled={victoryHandled.current || !machineState.matches('playerInput')} onClick={() => finishVictory('developer')}>자동 승리</button>}
          <button data-tutorial-target="end-turn" className="end-turn" disabled={(!board.placedCount && !playerStunned) || !livingCombatants.length || !machineState.matches('playerInput')} onClick={() => {
            if (tutorialMode) gameBridge.emit(GAME_EVENTS.TUTORIAL_ACTION, { type: 'turn-ended' })
            endTurn()
          }}>{machineState.matches('playerInput') ? (playerStunned ? '기절 턴 넘기기' : '턴 종료') : '처리 중…'} <span>→</span></button>
        </div>
      </div>
      {openPile && <BattlePileModal
        title={openPile === 'remaining' ? '남은 블록' : '버린 블록'}
        blocks={openPile === 'remaining'
          ? battlePiles.drawPile
          : battlePiles.discardPile}
        onClose={() => setOpenPile(null)}
      />}
      {tutorialVictory && (
        <aside className="tutorial-victory" role="status" aria-live="assertive">
          <small>튜토리얼 완료</small>
          <strong>잉걸불 슬라임을 제거했습니다.</strong>
          <span>이제 블록을 이용해 적들을 물리치세요!</span>
        </aside>
      )}
      {tutorialMode && !tutorialVictory && <>
        <button type="button" className="tutorial-exit-button" onClick={() => setTutorialExitConfirmOpen(true)}>튜토리얼 종료</button>
        <TutorialOverlay />
      </>}
      {tutorialExitConfirmOpen && !tutorialVictory && (
        <div className="tutorial-exit-confirm" role="presentation">
          <section role="dialog" aria-modal="true" aria-labelledby="tutorial-exit-title">
            <strong id="tutorial-exit-title">정말 튜토리얼을 종료하시겠습니까?</strong>
            <p>튜토리얼은 메인 화면에서 언제든지 다시 할 수 있습니다.</p>
            <div>
              <button type="button" onClick={onTutorialSkip}>예</button>
              <button type="button" autoFocus onClick={() => setTutorialExitConfirmOpen(false)}>아니오</button>
            </div>
          </section>
        </div>
      )}
    </main>
  )
}
