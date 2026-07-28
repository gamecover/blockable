import { useCallback, useEffect, useMemo, useState } from 'react'
import { useMachine } from '@xstate/react'
import { useStore } from 'zustand'
import { DEVELOPER_TOOLS_ENABLED } from '../config/developerMode.js'
import { appMachine } from '../game/machines/appMachine.js'
import { DEFAULT_DUNGEON } from '../game/constants/gameConfig.js'
import { pick } from '../game/systems/randomSystem.js'
import { canTravelToNode } from '../game/systems/mapGenerationSystem.js'
import { createCombatSlots } from '../game/systems/combatSlotSystem.js'
import { createBlockRewards, rollGoldReward } from '../game/systems/rewardSystem.js'
import { developerRunStore, normalRunStore } from '../game/state/useRunStore.js'
import { RunStoreProvider } from '../game/state/RunStoreContext.jsx'
import { SoundManager } from '../managers/SoundManager.js'
import { SplashScreen } from '../screens/main/SplashScreen.jsx'
import { MainScreen } from '../screens/main/MainScreen.jsx'
import { PrologueScreen } from '../screens/prologue/PrologueScreen.jsx'
import { MapScreen } from '../screens/map/MapScreen.jsx'
import { WorldMapScreen } from '../screens/map/WorldMapScreen.jsx'
import { BattleScreen } from '../screens/battle/BattleScreen.jsx'
import { RewardScreen } from '../screens/reward/RewardScreen.jsx'
import { EventScreen } from '../screens/event/EventScreen.jsx'
import { ResultScreen } from '../screens/result/ResultScreen.jsx'
import { CommonGameMenu } from '../components/game/CommonGameMenu.jsx'
import { StartBlockChoiceScreen } from '../screens/map/StartBlockChoiceScreen.jsx'
import { createUniqueBlockChoices } from '../objects/blocks/blockData.js'

export function App() {
  const [appState, send] = useMachine(appMachine)
  const [encounter, setEncounter] = useState(null)
  const [rewards, setRewards] = useState([])
  const [earnedGold, setEarnedGold] = useState(0)
  const [runMode, setRunMode] = useState('normal')
  const normalRun = useStore(normalRunStore)
  const developerRun = useStore(developerRunStore)
  const activeStore = runMode === 'developer' ? developerRunStore : normalRunStore
  const run = runMode === 'developer' ? developerRun : normalRun
  const developerMode = DEVELOPER_TOOLS_ENABLED && runMode === 'developer' && run.developerMode
  const uniqueBlockChoices = useMemo(
    () => createUniqueBlockChoices(run.uniqueBlockChoiceIds),
    [run.uniqueBlockChoiceIds],
  )

  useEffect(() => () => SoundManager.dispose(), [])

  const startNewRun = (mode = 'normal') => {
    SoundManager.unlock()
    const targetStore = mode === 'developer' ? developerRunStore : normalRunStore
    const targetRun = targetStore.getState()
    const prologueSeen = targetRun.prologueSeen
    targetRun.startRun()
    setRunMode(mode)
    send({ type: mode === 'developer' || prologueSeen ? 'START_CHOICE' : 'START' })
  }

  const continueRun = (mode = 'normal') => {
    SoundManager.unlock()
    const targetStore = mode === 'developer' ? developerRunStore : normalRunStore
    const targetRun = targetStore.getState()
    setRunMode(mode)
    if (!targetRun.uniqueBlockId) {
      send({ type: 'START_CHOICE' })
      return
    }
    if (targetRun.pendingBattle?.encounter) {
      setEncounter(targetRun.pendingBattle.encounter)
      targetRun.restorePendingBattle()
      send({ type: 'CONTINUE_BATTLE' })
      return
    }
    send({ type: targetRun.activeDungeonId ? 'CONTINUE_DUNGEON' : 'CONTINUE' })
  }

  const enterNode = (node) => {
    const canEnter = canTravelToNode(run.map, run.currentNodeId, node.id, developerMode)
    if (!canEnter) return
    if (node.status === 'complete') {
      run.moveToNode(node)
      return
    }

    run.selectNode(node)
    if (node.type === 'floor_start') return
    if (node.type === 'stairs') {
      run.completeNode()
      return
    }
    if (node.type === 'rest') {
      setEncounter({ type: 'event', event: 'rest' })
      send({ type: 'ENTER_EVENT' })
      return
    }
    if (node.type === 'event') {
      setEncounter({ type: 'event', event: Math.random() < 0.3 ? 'spring' : pick(['shop', 'chest']) })
      send({ type: 'ENTER_EVENT' })
      return
    }
    const combat = createCombatSlots({
      node,
      floor: node.floor,
      difficultyTier: run.map.difficulty ?? DEFAULT_DUNGEON.difficulty,
    })
    const nextEncounter = { type: node.type, grade: node.grade, node, ...combat, monster: combat.monsters[0] }
    setEncounter(nextEncounter)
    run.beginBattle(nextEncounter)
    send({ type: 'ENTER_BATTLE' })
  }

  const enterDungeon = (dungeon) => {
    if (dungeon.status === 'locked' && !developerMode) return
    run.enterDungeon(dungeon)
    send({ type: 'ENTER_DUNGEON' })
  }

  const winBattle = useCallback(() => {
    const gold = rollGoldReward()
    setEarnedGold(gold)
    run.addGold(gold)
    run.clearPendingBattle()
    if (encounter?.type === 'boss') {
      run.completeNode()
      const activeDungeon = run.worldMap.dungeons.find(({ id }) => id === run.activeDungeonId)
      run.completeDungeon()
      send({ type: activeDungeon?.kind === 'final' ? 'BOSS_WIN' : 'DUNGEON_WIN' })
      return
    }
    setRewards(createBlockRewards())
    send({ type: 'WIN' })
  }, [encounter, run, send])

  const finishReward = (block) => {
    if (block) run.addBlock(block)
    run.completeNode()
    if (encounter?.type !== 'boss') {
      send({ type: 'DONE' })
      return
    }
    send({ type: encounter.node?.isFinalBoss ? 'BOSS_WIN' : 'FLOOR_BOSS_WIN' })
  }

  const resolveEvent = (result) => {
    if (result.gold) run.addGold(result.gold)
    if (result.maxHealth) run.gainMaxHealth(result.maxHealth)
    if (result.remove) run.removeBlock(result.remove)
    if (result.replaceBlock) run.replaceBlock(result.replaceBlock.id, result.replaceBlock)
    if (result.heal) run.heal(result.heal)
    run.completeNode()
    send({ type: 'DONE' })
  }

  const chooseStartingBlock = (block) => {
    run.chooseUniqueBlock(block)
    send({ type: run.activeDungeonId ? 'DONE_DUNGEON' : 'DONE' })
  }

  const abandonBattle = () => {
    run.clearPendingBattle()
    send({ type: 'ABANDON' })
  }

  const backToMenu = () => {
    activeStore.setState({ lastSavedAt: Date.now() })
    send({ type: 'MENU' })
  }

  const current = appState.value
  const monster = useMemo(() => encounter?.monster, [encounter])
  if (current === 'splash') return <SplashScreen onReady={() => send({ type: 'READY' })} />
  if (current === 'menu') return <MainScreen
    canContinue={normalRun.runStarted}
    onStart={() => startNewRun('normal')}
    onContinue={() => continueRun('normal')}
    developerToolsEnabled={DEVELOPER_TOOLS_ENABLED}
    canDeveloperContinue={developerRun.runStarted}
    onDeveloperStart={() => startNewRun('developer')}
    onDeveloperContinue={() => continueRun('developer')}
  />

  let screen = null
  if (current === 'prologue') screen = <PrologueScreen onContinue={() => { run.markPrologueSeen(); send({ type: 'CONTINUE' }) }} />
  if (current === 'worldMap') screen = <WorldMapScreen {...run} developerMode={developerMode} onSelect={enterDungeon} />
  if (current === 'map') screen = <MapScreen {...run} developerMode={developerMode} onDebugAddGold={() => { if (developerMode) run.addGold(1000) }} onDebugAddHealth={() => { if (developerMode) run.gainMaxHealth(25) }} onLeaveDungeon={() => { run.leaveDungeon(); send({ type: 'LEAVE_DUNGEON' }) }} onSelect={enterNode} />
  if (current === 'startChoice') screen = <StartBlockChoiceScreen choices={uniqueBlockChoices} onChoose={chooseStartingBlock} />
  if (current === 'battle' && monster) screen = <BattleScreen key={run.currentNodeId} developerMode={developerMode} monster={monster} monsters={encounter.monsters} battleType={encounter.battleType} onWin={winBattle} onLose={() => { run.clearPendingBattle(); send({ type: 'LOSE' }) }} onAbandon={abandonBattle} />
  if (current === 'reward') screen = <RewardScreen rewards={rewards} gold={earnedGold} onChoose={finishReward} onSkip={() => finishReward(null)} />
  if (current === 'event') screen = <EventScreen event={encounter?.event} {...run} onResolve={resolveEvent} />
  if (current === 'gameover') screen = <ResultScreen floor={run.floor} onMenu={backToMenu} />
  if (current === 'ending') screen = <ResultScreen victory floor={run.floor} onMenu={backToMenu} />

  return <RunStoreProvider store={activeStore}>
    {screen}
    <CommonGameMenu
        floor={run.floor}
        map={run.map}
        worldMap={run.worldMap}
        deck={run.deck}
        activeDungeonId={run.activeDungeonId}
        discoveredBlueprintIds={run.discoveredBlueprintIds}
        currentNodeId={run.currentNodeId}
        currentScreen={current}
        onMainMenu={backToMenu}
      />
  </RunStoreProvider>
}
