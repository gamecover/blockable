import { createStore } from 'zustand/vanilla'
import { persist, createJSONStorage } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import { generateMap, completeAndUnlockNext, findMapNode } from '../systems/mapGenerationSystem.js'
import { createStarterDeck } from '../../objects/blocks/blockData.js'
import { createCombatantState } from '../systems/statusEffectSystem.js'
import { STARTING_GOLD, STARTING_MAX_HEALTH } from '../constants/gameConfig.js'
import { isValidSave } from '../../security/validation/saveValidation.js'
import { discardHand, drawHand, startBattleDeck } from '../systems/deckSystem.js'
import { trackedLocalStorage } from './trackedStorage.js'

const initialRun = (developerMode = false) => ({
  health: STARTING_MAX_HEALTH,
  maxHealth: STARTING_MAX_HEALTH,
  armor: 0,
  gold: STARTING_GOLD,
  deck: createStarterDeck(),
  map: generateMap(),
  currentNodeId: null,
  floor: 1,
  nodeStep: 1,
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
    state.nodeStep = node.step
  }),
  completeNode: () => set((state) => {
    const completedNode = findMapNode(state.map, state.currentNodeId)
    state.map = completeAndUnlockNext(state.map, state.currentNodeId)
    if (completedNode?.type === 'boss' && !completedNode.isFinalBoss) {
      state.floor = completedNode.floor + 1
      state.nodeStep = 1
    }
  }),
  damagePlayer: (amount) => set((state) => {
    const absorbed = Math.min(state.armor, amount)
    state.armor -= absorbed
    state.health = Math.max(0, state.health - (amount - absorbed))
  }),
  clearArmor: () => set((state) => { state.armor = 0 }),
  addGold: (amount) => set((state) => { state.gold = Math.max(0, state.gold + amount) }),
  addBlock: (block) => set((state) => { state.deck.push(block) }),
  removeBlock: (id) => set((state) => { state.deck = state.deck.filter((block) => block.id !== id) }),
  heal: (amount) => set((state) => { state.health = Math.min(state.maxHealth, state.health + amount) }),
  gainMaxHealth: (amount) => set((state) => { state.maxHealth += amount; state.health += amount }),
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
  drawNextHand: () => set((state) => {
    state.battlePiles = drawHand(discardHand(state.battlePiles))
  }),
})), {
  name: storageName,
  storage: createJSONStorage(() => trackedLocalStorage),
  partialize: ({ health, maxHealth, gold, deck, map, currentNodeId, floor, nodeStep, prologueSeen, runStarted, developerMode, pendingBattle }) =>
    ({ health, maxHealth, gold, deck, map, currentNodeId, floor, nodeStep, prologueSeen, runStarted, developerMode, pendingBattle }),
  merge: (persisted, current) => isValidSave(persisted)
    ? { ...current, ...persisted, developerMode }
    : current,
}))

export const normalRunStore = createRunStore({
  storageName: 'blockable-save-v1',
  developerMode: false,
})

export const developerRunStore = createRunStore({
  storageName: 'blockable-developer-save-v1',
  developerMode: true,
})
