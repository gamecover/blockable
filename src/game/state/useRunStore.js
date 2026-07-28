import { createStore } from 'zustand/vanilla'
import { persist, createJSONStorage } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { generateMap, completeAndUnlockNext, findMapNode } from '../systems/mapGenerationSystem.js'
import { createStarterDeck, hydrateBlock } from '../../objects/blocks/blockData.js'
import {
  addStatus,
  createCombatantState,
  getDamageMultiplier,
  resolveTurnEndStatuses,
} from '../systems/statusEffectSystem.js'
import { HAND_SIZE, STARTING_GOLD, STARTING_MAX_HEALTH } from '../constants/gameConfig.js'
import { isValidSave } from '../../security/validation/saveValidation.js'
import { discardHand, drawHand, startBattleDeck } from '../systems/deckSystem.js'
import { trackedLocalStorage } from './trackedStorage.js'
import { completeWorldDungeon, createWorldMapState } from '../systems/worldMapSystem.js'

const initialRun = (developerMode = false) => ({
  health: STARTING_MAX_HEALTH,
  maxHealth: STARTING_MAX_HEALTH,
  armor: 0,
  gold: STARTING_GOLD,
  deck: createStarterDeck(),
  map: generateMap(),
  worldMap: createWorldMapState(),
  activeDungeonId: null,
  currentNodeId: null,
  floor: 1,
  prologueSeen: false,
  runStarted: false,
  developerMode,
  battlePiles: { drawPile: [], hand: [], discardPile: [], remainingCount: 0 },
  combat: {
    player: createCombatantState(),
    monster: createCombatantState(),
  },
  pendingBattle: null,
})

const createRunStore = ({ storageName, developerMode }) => createStore(persist(immer((set) => ({
  ...initialRun(developerMode),
  startRun: () => set((state) => {
    const prologueSeen = state.prologueSeen
    Object.assign(state, initialRun(developerMode))
    state.deck = createStarterDeck()
    state.runStarted = true
    state.prologueSeen = prologueSeen
  }),
  selectNode: (node) => set((state) => {
    state.currentNodeId = node.id
    state.floor = node.floor
  }),
  enterDungeon: (dungeon) => set((state) => {
    state.activeDungeonId = dungeon.id
    state.map = generateMap({
      dungeonId: dungeon.id,
      dungeonName: dungeon.name,
      difficulty: dungeon.difficulty,
    })
    state.currentNodeId = null
    state.floor = 1
  }),
  leaveDungeon: () => set((state) => {
    state.activeDungeonId = null
    state.currentNodeId = null
  }),
  completeDungeon: () => set((state) => {
    if (!state.activeDungeonId) return
    state.worldMap = completeWorldDungeon(state.worldMap, state.activeDungeonId)
    state.activeDungeonId = null
    state.currentNodeId = null
  }),
  moveToNode: (node) => set((state) => {
    state.currentNodeId = node.id
    state.floor = node.floor
  }),
  completeNode: () => set((state) => {
    const completedNode = findMapNode(state.map, state.currentNodeId)
    state.map = completeAndUnlockNext(state.map, state.currentNodeId)
    if (completedNode?.type === 'stairs') {
      state.floor = completedNode.floor + 1
      state.currentNodeId = state.map.floors.find(({ number }) =>
        number === state.floor)?.startNodeId ?? null
    }
  }),
  damagePlayer: (amount, attackerStatuses = []) => set((state) => {
    const adjustedAmount = Math.max(0, Math.floor(
      amount
      * getDamageMultiplier(attackerStatuses, 'outgoing')
      * getDamageMultiplier(state.combat.player.statuses, 'incoming'),
    ))
    const absorbed = Math.min(state.armor, adjustedAmount)
    state.armor -= absorbed
    state.health = Math.max(0, state.health - (adjustedAmount - absorbed))
  }),
  clearArmor: () => set((state) => { state.armor = 0 }),
  gainArmor: (amount) => set((state) => { state.armor += Math.max(0, amount) }),
  addGold: (amount) => set((state) => { state.gold = Math.max(0, state.gold + amount) }),
  addBlock: (block) => set((state) => { state.deck.push(block) }),
  removeBlock: (id) => set((state) => { state.deck = state.deck.filter((block) => block.id !== id) }),
  heal: (amount) => set((state) => { state.health = Math.min(state.maxHealth, state.health + amount) }),
  gainMaxHealth: (amount) => set((state) => { state.maxHealth += amount; state.health += amount }),
  applyCombatStatus: (target, statusId, stacks, newlyApplied = false) => set((state) => {
    if (!state.combat[target]) return
    state.combat[target].statuses = addStatus(state.combat[target].statuses, statusId, stacks, newlyApplied)
  }),
  resolvePlayerTurnEndStatuses: (placedCount) => set((state) => {
    const result = resolveTurnEndStatuses({
      health: state.health,
      armor: state.armor,
      statuses: state.combat.player.statuses,
      placedCount,
    })
    state.health = result.health
    state.armor = result.armor
    state.combat.player.statuses = result.statuses
  }),
  markPrologueSeen: () => set((state) => { state.prologueSeen = true }),
  beginBattle: (encounter) => set((state) => {
    state.pendingBattle = {
      encounter,
      health: state.health,
      maxHealth: state.maxHealth,
      armor: state.armor,
      gold: state.gold,
      deck: state.deck,
    }
    state.battlePiles = drawHand(startBattleDeck(state.deck))
    state.armor = 0
    state.combat = {
      player: createCombatantState(),
      monster: createCombatantState(),
    }
  }),
  restorePendingBattle: () => set((state) => {
    if (!state.pendingBattle) return
    const snapshot = state.pendingBattle
    state.health = snapshot.health
    state.maxHealth = snapshot.maxHealth
    state.armor = 0
    state.gold = snapshot.gold
    state.deck = snapshot.deck
    state.battlePiles = drawHand(startBattleDeck(snapshot.deck))
    state.combat = {
      player: createCombatantState(),
      monster: createCombatantState(),
    }
  }),
  clearPendingBattle: () => set((state) => { state.pendingBattle = null }),
  drawNextHand: (extraCount = 0) => set((state) => {
    state.battlePiles = drawHand(discardHand(state.battlePiles), HAND_SIZE + Math.max(0, extraCount))
  }),
})), {
  name: storageName,
  storage: createJSONStorage(() => trackedLocalStorage),
  partialize: ({ health, maxHealth, gold, deck, map, worldMap, activeDungeonId, currentNodeId, floor, prologueSeen, runStarted, developerMode, pendingBattle }) =>
    ({ health, maxHealth, gold, deck, map, worldMap, activeDungeonId, currentNodeId, floor, prologueSeen, runStarted, developerMode, pendingBattle }),
  merge: (persisted, current) => {
    if (!isValidSave(persisted)) return current
    const deck = persisted.deck.map(hydrateBlock)
    const pendingBattle = persisted.pendingBattle
      ? {
          ...persisted.pendingBattle,
          deck: (persisted.pendingBattle.deck ?? persisted.deck).map(hydrateBlock),
        }
      : null
    return { ...current, ...persisted, deck, pendingBattle, developerMode }
  },
}))

export const normalRunStore = createRunStore({
  storageName: 'blockable-save-v1',
  developerMode: false,
})

export const developerRunStore = createRunStore({
  storageName: 'blockable-developer-save-v1',
  developerMode: true,
})
