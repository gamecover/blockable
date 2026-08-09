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
import { developerRunStore, normalRunStore, tutorialRunStore } from '../game/state/useRunStore.js'
import { RunStoreProvider } from '../game/state/RunStoreContext.jsx'
import { SoundManager } from '../managers/SoundManager.js'
import {
  BGM_ASSETS,
  getDungeonBackgroundBgmKeys,
  getDungeonEntryBgmKeys,
  getMonsterBgmKey,
  getScreenBgmRequests,
} from '../assets/manifests/bgmManifest.js'
import { SplashScreen } from '../screens/main/SplashScreen.jsx'
import { MainScreen } from '../screens/main/MainScreen.jsx'
import { PrologueScreen } from '../screens/prologue/PrologueScreen.jsx'
import { MapScreen } from '../screens/map/MapScreen.jsx'
import { WorldMapScreen } from '../screens/map/WorldMapScreen.jsx'
import { BattleScreen } from '../screens/battle/BattleScreen.jsx'
import { RewardScreen } from '../screens/reward/RewardScreen.jsx'
import { EventScreen } from '../screens/event/EventScreen.jsx'
import { ResultScreen } from '../screens/result/ResultScreen.jsx'
import { DungeonConquestScreen } from '../screens/result/DungeonConquestScreen.jsx'
import { CommonGameMenu } from '../components/game/CommonGameMenu.jsx'
import { StartBlockChoiceScreen } from '../screens/map/StartBlockChoiceScreen.jsx'
import { DungeonLoadingScreen } from '../screens/map/DungeonLoadingScreen.jsx'
import { createUniqueBlockChoices } from '../objects/blocks/blockData.js'
import { createMonsterEncounter, getMonsterDefinition } from '../game/systems/monsterDesignSystem.js'

export function App() {
  const [appState, send] = useMachine(appMachine)
  const [encounter, setEncounter] = useState(null)
  const [rewards, setRewards] = useState([])
  const [earnedGold, setEarnedGold] = useState(0)
  const [runMode, setRunMode] = useState('normal')
  const [conqueredDungeonName, setConqueredDungeonName] = useState('')
  const [finalBossName, setFinalBossName] = useState('')
  const [resultFloor, setResultFloor] = useState(1)
  const [resultDeathCause, setResultDeathCause] = useState(null)
  const [areaLoading, setAreaLoading] = useState(null)
  const [tutorialReturn, setTutorialReturn] = useState('menu')
  const [tutorialAttempt, setTutorialAttempt] = useState(0)
  const normalRun = useStore(normalRunStore)
  const developerRun = useStore(developerRunStore)
  const tutorialRun = useStore(tutorialRunStore)
  const activeStore = runMode === 'tutorial'
    ? tutorialRunStore
    : runMode === 'developer' ? developerRunStore : normalRunStore
  const run = runMode === 'tutorial'
    ? tutorialRun
    : runMode === 'developer' ? developerRun : normalRun
  const developerMode = DEVELOPER_TOOLS_ENABLED && runMode === 'developer' && run.developerMode
  const uniqueBlockChoices = useMemo(
    () => createUniqueBlockChoices(run.uniqueBlockChoiceIds),
    [run.uniqueBlockChoiceIds],
  )
  const current = appState.value
  const encounterMusicMonsterId = encounter?.monsters
    ?.find(({ slotId }) => slotId === 5)?.id
    ?? encounter?.monsters?.[0]?.id
    ?? encounter?.monster?.id

  useEffect(() => {
    Object.entries(BGM_ASSETS).forEach(([key, source]) => {
      SoundManager.registerMusic(key, source)
    })
    return () => SoundManager.dispose()
  }, [])

  useEffect(() => {
    const bgmRequests = getScreenBgmRequests({
      screen: current,
      activeDungeonId: run.activeDungeonId,
      monsterId: encounterMusicMonsterId,
      eventId: typeof encounter?.event === 'string'
        ? encounter.event
        : encounter?.event?.id,
    })
    SoundManager.setMusicRequests(bgmRequests)
  }, [current, encounter?.event, encounterMusicMonsterId, run.activeDungeonId])

  const startNewRun = (mode = 'normal') => {
    SoundManager.unlock()
    const targetStore = mode === 'developer' ? developerRunStore : normalRunStore
    const targetRun = targetStore.getState()
    const prologueSeen = targetRun.prologueSeen
    targetRun.startRun()
    setResultDeathCause(null)
    setFinalBossName('')
    setRunMode(mode)
    if (mode === 'normal' && prologueSeen && !targetRun.tutorialCompleted) {
      beginTutorial('game')
      return
    }
    send({ type: mode === 'developer' || prologueSeen ? 'START_CHOICE' : 'START' })
  }

  const createTutorialEncounter = () => {
    const definition = getMonsterDefinition('ember_slime')
    if (!definition) throw new Error('튜토리얼 몬스터 잉걸불 슬라임을 찾을 수 없습니다.')
    const monster = {
      ...createMonsterEncounter(definition),
      instanceId: 'ember_slime-tutorial',
      slotId: 1,
    }
    return {
      type: 'battle',
      grade: 'normal',
      battleType: 'normal',
      monsters: [monster],
      monster,
      node: { id: 'tutorial-battle', type: 'battle', grade: 'normal', floor: 1 },
    }
  }

  const beginTutorial = (returnTo = 'menu') => {
    SoundManager.unlock()
    const targetRun = tutorialRunStore.getState()
    const nextEncounter = createTutorialEncounter()
    targetRun.startTutorialRun()
    targetRun.beginBattle(nextEncounter)
    setEncounter(nextEncounter)
    setTutorialReturn(returnTo)
    setTutorialAttempt((attempt) => attempt + 1)
    setRunMode('tutorial')
    send({ type: current === 'prologue' ? 'CONTINUE' : 'START_TUTORIAL' })
  }

  const finishTutorial = () => {
    normalRunStore.getState().markTutorialCompleted()
    tutorialRunStore.getState().deleteRun()
    setEncounter(null)
    setRunMode('normal')
    send({ type: tutorialReturn === 'menu' ? 'TUTORIAL_MENU' : 'TUTORIAL_GAME' })
  }

  const restartTutorialBattle = () => {
    const targetRun = tutorialRunStore.getState()
    const nextEncounter = createTutorialEncounter()
    targetRun.startTutorialRun()
    targetRun.beginBattle(nextEncounter)
    setEncounter(nextEncounter)
    setTutorialAttempt((attempt) => attempt + 1)
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
    if (targetRun.activeDungeonId) {
      send({ type: 'CONTINUE_DUNGEON' })
      void prepareDungeonBackgroundMusic()
      return
    }
    send({ type: 'CONTINUE' })
  }

  const enterNode = (node) => {
    const canEnter = canTravelToNode(run.map, run.currentNodeId, node.id, developerMode)
    if (!canEnter) return
    if (node.status === 'complete') {
      run.moveToNode(node)
      return
    }

    if (node.type === 'floor_start') {
      run.selectNode(node)
      return
    }
    if (node.type === 'stairs') {
      run.selectNode(node)
      run.completeNode()
      return
    }
    if (node.type === 'rest') {
      run.selectNode(node)
      setEncounter({ type: 'event', event: 'rest' })
      send({ type: 'ENTER_EVENT' })
      return
    }
    if (node.type === 'event') {
      run.selectNode(node)
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
    const musicMonsterId = combat.monsters.find(({ slotId }) => slotId === 5)?.id
      ?? combat.monsters[0]?.id
    const musicKey = getMonsterBgmKey(musicMonsterId)
    const completeEntry = () => {
      run.selectNode(node)
      setEncounter(nextEncounter)
      run.beginBattle(nextEncounter)
      setAreaLoading(null)
      send({ type: 'ENTER_BATTLE' })
    }
    if (!musicKey || SoundManager.isMusicReady(musicKey)) {
      completeEntry()
      return
    }
    const prepareBattleMusic = () => {
      setAreaLoading((currentLoading) => currentLoading
        ? { ...currentLoading, error: '' }
        : currentLoading)
      SoundManager.prepareMusic(musicKey)
        .then(() => SoundManager.primeMusic(musicKey))
        .then(completeEntry)
        .catch((error) => setAreaLoading((currentLoading) => currentLoading
          ? { ...currentLoading, error: error instanceof Error ? error.message : String(error) }
          : currentLoading))
    }
    setAreaLoading({
      kind: 'battle',
      dungeonId: run.activeDungeonId,
      title: nextEncounter.monster?.name ?? '전투 준비',
      message: '적의 기척을 살피고 전투 태세를 갖추고 있습니다.',
      retry: prepareBattleMusic,
      continue: completeEntry,
      error: '',
    })
    prepareBattleMusic()
  }

  const prepareDungeonBackgroundMusic = async () => {
    try {
      for (const musicKey of getDungeonBackgroundBgmKeys()) {
        await SoundManager.prepareMusic(musicKey)
        await SoundManager.primeMusic(musicKey)
      }
    } catch (error) {
      console.warn('던전 몬스터 BGM 백그라운드 준비 실패:', error)
    }
  }

  const completeDungeonEntry = (dungeon) => {
    setAreaLoading(null)
    run.enterDungeon(dungeon)
    send({ type: 'ENTER_DUNGEON' })
    void prepareDungeonBackgroundMusic()
  }

  const prepareDungeon = (dungeon, showLoading = false) => {
    if (dungeon.status === 'locked' && !developerMode) return
    const musicKeys = getDungeonEntryBgmKeys(dungeon.id)
    if (!musicKeys.length) {
      if (showLoading) completeDungeonEntry(dungeon)
      return
    }
    if (showLoading) {
      const retry = () => prepareDungeon(dungeon, true)
      setAreaLoading({
        kind: 'dungeon',
        dungeonId: dungeon.id,
        title: dungeon.name,
        message: '원정에 필요한 준비를 하고 있습니다.',
        retry,
        continue: () => completeDungeonEntry(dungeon),
        error: '',
      })
    }
    const prepareDungeonAssets = async () => {
      for (const musicKey of musicKeys) await SoundManager.prepareMusic(musicKey)
      if (showLoading) {
        for (const musicKey of musicKeys) await SoundManager.primeMusic(musicKey)
      }
    }
    prepareDungeonAssets()
      .then(() => { if (showLoading) completeDungeonEntry(dungeon) })
      .catch((error) => {
        if (!showLoading) return
        setAreaLoading((currentLoading) => currentLoading
          ? { ...currentLoading, error: error instanceof Error ? error.message : String(error) }
          : currentLoading)
      })
  }

  const enterDungeon = (dungeon) => prepareDungeon(dungeon, true)

  const deleteActiveRun = useCallback(() => {
    activeStore.getState().deleteRun()
    activeStore.persist.clearStorage()
    setEncounter(null)
    setRewards([])
    setEarnedGold(0)
  }, [activeStore])

  const winBattle = useCallback(() => {
    const gold = rollGoldReward()
    setEarnedGold(gold)
    run.addGold(gold)
    run.clearPendingBattle()
    if (encounter?.type === 'boss') {
      run.completeNode()
      const activeDungeon = run.worldMap.dungeons.find(({ id }) => id === run.activeDungeonId)
      setConqueredDungeonName(activeDungeon?.name ?? run.map.dungeonName)
      run.completeDungeon()
      if (activeDungeon?.kind === 'final') {
        setFinalBossName(
          encounter.monsters?.find(({ slotId }) => slotId === 5)?.name
          ?? encounter.monster?.name
          ?? '',
        )
        setResultFloor(run.floor)
        deleteActiveRun()
      }
      send({ type: activeDungeon?.kind === 'final' ? 'BOSS_WIN' : 'DUNGEON_WIN' })
      return
    }
    setRewards(createBlockRewards())
    send({ type: 'WIN' })
  }, [deleteActiveRun, encounter, run, send])

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

  const resolveShopTransaction = (result) => {
    if (result.gold) run.addGold(result.gold)
    if (result.addBlock) run.addBlock(result.addBlock)
    if (result.remove) run.removeBlock(result.remove)
  }

  const chooseStartingBlock = (block) => {
    run.chooseUniqueBlock(block)
    send({ type: run.activeDungeonId ? 'DONE_DUNGEON' : 'DONE' })
  }

  const abandonBattle = () => {
    run.clearPendingBattle()
    if (developerMode) {
      run.returnToPreviousNode()
      send({ type: 'ABANDON' })
      return
    }
    setResultFloor(run.floor)
    deleteActiveRun()
    send({ type: 'LOSE' })
  }

  const quitBattleToMain = () => {
    if (activeStore.getState().runStarted) {
      activeStore.setState({ lastSavedAt: Date.now() })
    }
    setEncounter(null)
    send({ type: 'MENU' })
  }

  const handleBattleLoss = () => {
    setResultFloor(run.floor)
    setResultDeathCause(activeStore.getState().deathCause)
    deleteActiveRun()
    send({ type: 'LOSE' })
  }

  const backToMenu = () => {
    if (activeStore.getState().runStarted) {
      activeStore.setState({ lastSavedAt: Date.now() })
    }
    send({ type: 'MENU' })
  }

  const monster = useMemo(() => encounter?.monster, [encounter])
  if (current === 'splash') return <SplashScreen onReady={() => send({ type: 'READY' })} />
  if (current === 'menu') return <MainScreen
    canContinue={normalRun.runStarted}
    onStart={() => startNewRun('normal')}
    onContinue={() => continueRun('normal')}
    onTutorial={() => beginTutorial('menu')}
    developerToolsEnabled={DEVELOPER_TOOLS_ENABLED}
    canDeveloperContinue={developerRun.runStarted}
    onDeveloperStart={() => startNewRun('developer')}
    onDeveloperContinue={() => continueRun('developer')}
  />
  if (areaLoading) return <DungeonLoadingScreen
    dungeonId={areaLoading.dungeonId}
    title={areaLoading.title}
    message={areaLoading.message}
    error={areaLoading.error}
    onRetry={areaLoading.retry}
    onContinue={areaLoading.continue}
  />

  let screen = null
  if (current === 'prologue') screen = <PrologueScreen onContinue={() => {
    normalRunStore.getState().markPrologueSeen()
    beginTutorial('game')
  }} />
  if (current === 'worldMap') screen = <WorldMapScreen {...run} developerMode={developerMode} onDeveloperDifficultyChange={(difficulty) => { if (developerMode) run.setDeveloperDifficulty(difficulty) }} onPrepare={(dungeon) => prepareDungeon(dungeon)} onSelect={enterDungeon} />
  if (current === 'map') screen = <MapScreen {...run} developerMode={developerMode} onDebugAddGold={() => { if (developerMode) run.addGold(1000) }} onDebugAddHealth={() => { if (developerMode) run.gainMaxHealth(25) }} onLeaveDungeon={() => { run.leaveDungeon(); send({ type: 'LEAVE_DUNGEON' }) }} onSelect={enterNode} />
  if (current === 'startChoice') screen = <StartBlockChoiceScreen choices={uniqueBlockChoices} onChoose={chooseStartingBlock} />
  if (current === 'battle' && monster) screen = <BattleScreen key={run.currentNodeId} dungeonId={run.activeDungeonId} developerMode={developerMode} monster={monster} monsters={encounter.monsters} battleType={encounter.battleType} onWin={winBattle} onLose={handleBattleLoss} onAbandon={abandonBattle} onQuitToMain={quitBattleToMain} />
  if (current === 'tutorial' && monster) screen = <BattleScreen
    key={`tutorial-${tutorialAttempt}`}
    tutorialMode
    dungeonId="ashen-forge-east"
    monster={monster}
    monsters={encounter.monsters}
    battleType="normal"
    onWin={finishTutorial}
    onLose={restartTutorialBattle}
    onAbandon={finishTutorial}
    onTutorialSkip={finishTutorial}
  />
  if (current === 'reward') screen = <RewardScreen rewards={rewards} gold={earnedGold} onChoose={finishReward} onSkip={() => finishReward(null)} />
  if (current === 'event') screen = <EventScreen event={encounter?.event} dungeonId={run.activeDungeonId} {...run} onResolve={resolveEvent} onShopTransaction={resolveShopTransaction} onDefer={() => send({ type: 'DONE' })} />
  if (current === 'dungeonConquest') screen = <DungeonConquestScreen dungeonName={conqueredDungeonName} onContinue={() => send({ type: 'CONTINUE' })} />
  if (current === 'gameover') screen = <ResultScreen floor={resultFloor} deathCause={resultDeathCause} onMenu={backToMenu} />
  if (current === 'ending') screen = <ResultScreen victory floor={resultFloor} victoryBossName={finalBossName} onMenu={backToMenu} />

  const commonMenuTitles = {
    prologue: '프롤로그',
    worldMap: '전체 지도',
    map: run.map?.dungeonName ?? '던전 지도',
    startChoice: '원정 준비',
    reward: '전리품을 선택하세요',
    event: '인카운터',
    dungeonConquest: conqueredDungeonName || '던전 정복',
    gameover: '원정 실패',
    ending: '던전 정복',
  }

  return <RunStoreProvider store={activeStore}>
    {screen}
    {current !== 'battle' && <CommonGameMenu
        floor={run.floor}
        map={run.map}
        worldMap={run.worldMap}
        deck={run.deck}
        gold={run.gold}
        health={run.health}
        activeDungeonId={run.activeDungeonId}
        discoveredBlueprintIds={run.discoveredBlueprintIds}
        currentNodeId={run.currentNodeId}
        currentScreen={current}
        title={commonMenuTitles[current]}
        showLeft={current !== 'startChoice'}
        developerMode={developerMode}
        onMainMenu={backToMenu}
      />}
  </RunStoreProvider>
}
