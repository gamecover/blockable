import { useCallback, useEffect, useMemo, useState } from 'react'
import { useMachine } from '@xstate/react'
import { appMachine } from '../game/machines/appMachine.js'
import { MONSTERS } from '../game/constants/gameConfig.js'
import { pick } from '../game/systems/randomSystem.js'
import { createBlockRewards, rollGoldReward } from '../game/systems/rewardSystem.js'
import { useRunStore } from '../game/state/useRunStore.js'
import { SoundManager } from '../managers/SoundManager.js'
import { SplashScreen } from '../screens/main/SplashScreen.jsx'
import { MainScreen } from '../screens/main/MainScreen.jsx'
import { PrologueScreen } from '../screens/prologue/PrologueScreen.jsx'
import { MapScreen } from '../screens/map/MapScreen.jsx'
import { BattleScreen } from '../screens/battle/BattleScreen.jsx'
import { RewardScreen } from '../screens/reward/RewardScreen.jsx'
import { EventScreen } from '../screens/event/EventScreen.jsx'
import { ResultScreen } from '../screens/result/ResultScreen.jsx'
import { CommonGameMenu } from '../components/game/CommonGameMenu.jsx'

export function App() {
  const [appState, send] = useMachine(appMachine)
  const [encounter, setEncounter] = useState(null)
  const [rewards, setRewards] = useState([])
  const [earnedGold, setEarnedGold] = useState(0)
  const run = useRunStore()

  useEffect(() => () => SoundManager.dispose(), [])

  const startNewRun = () => {
    SoundManager.unlock()
    const prologueSeen = run.prologueSeen
    run.startRun('L')
    send({ type: prologueSeen ? 'CONTINUE' : 'START' })
  }

  const enterNode = (node) => {
    run.selectNode(node)
    if (node.type === 'event') {
      setEncounter({ type: 'event', event: Math.random() < 0.3 ? 'spring' : pick(['shop', 'chest']) })
      send({ type: 'ENTER_EVENT' })
      return
    }
    const monster = node.type === 'boss' ? MONSTERS.boss : pick(MONSTERS.normal)
    setEncounter({ type: node.type, monster })
    run.beginBattle()
    send({ type: 'ENTER_BATTLE' })
  }

  const winBattle = useCallback(() => {
    const gold = rollGoldReward()
    setEarnedGold(gold)
    setRewards(createBlockRewards())
    run.addGold(gold)
    run.completeNode()
    send({ type: 'WIN' })
  }, [run, send])

  const finishReward = (block) => {
    if (block) run.addBlock(block)
    send({ type: encounter?.type === 'boss' ? 'BOSS_WIN' : 'DONE' })
  }

  const resolveEvent = (result) => {
    if (result.gold) run.addGold(result.gold)
    if (result.maxHealth) run.gainMaxHealth(result.maxHealth)
    if (result.remove) run.removeBlock(result.remove)
    run.completeNode()
    send({ type: 'DONE' })
  }

  const backToMenu = () => {
    useRunStore.setState({ lastSavedAt: Date.now() })
    send({ type: 'MENU' })
  }

  const current = appState.value
  const monster = useMemo(() => encounter?.monster, [encounter])
  if (current === 'splash') return <SplashScreen onReady={() => send({ type: 'READY' })} />
  if (current === 'menu') return <MainScreen canContinue={run.runStarted} onStart={startNewRun} onContinue={() => { SoundManager.unlock(); send({ type: 'CONTINUE' }) }} />

  let screen = null
  if (current === 'prologue') screen = <PrologueScreen onContinue={() => { run.markPrologueSeen(); send({ type: 'CONTINUE' }) }} />
  if (current === 'map') screen = <MapScreen {...run} onSelect={enterNode} />
  if (current === 'battle' && monster) screen = <BattleScreen key={run.currentNodeId} monster={monster} onWin={winBattle} onLose={() => send({ type: 'LOSE' })} onAbandon={() => send({ type: 'ABANDON' })} />
  if (current === 'reward') screen = <RewardScreen rewards={rewards} gold={earnedGold} onChoose={finishReward} onSkip={() => finishReward(null)} />
  if (current === 'event') screen = <EventScreen event={encounter?.event} {...run} onResolve={resolveEvent} />
  if (current === 'gameover') screen = <ResultScreen floor={run.floor} onMenu={backToMenu} />
  if (current === 'ending') screen = <ResultScreen victory floor={run.floor} onMenu={backToMenu} />

  return <>
    {screen}
    <CommonGameMenu
      floor={run.floor}
      map={run.map}
      deck={run.deck}
      currentNodeId={run.currentNodeId}
      currentScreen={current}
      onMainMenu={backToMenu}
    />
  </>
}
