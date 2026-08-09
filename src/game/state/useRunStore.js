import { createStore } from 'zustand/vanilla'
import { persist, createJSONStorage } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
import {
  generateMap,
  completeAndUnlockNext,
  enterFloorAtStart,
  findMapNode,
  revealMapAroundNode,
} from '../systems/mapGenerationSystem.js'
import {
  createStarterDeck,
  createTutorialDeck,
  createUniqueBlockChoiceIds,
  hydrateBlock,
} from '../../objects/blocks/blockData.js'
import {
  addStatus,
  addStatusUpdate,
  createCombatantState,
  calculateGeneralDamage,
  consumeOneShotStatus,
  resolveTurnEndStatuses,
  STATUS_EFFECTS,
} from '../systems/statusEffectSystem.js'
import { HAND_SIZE, STARTING_GOLD, STARTING_MAX_HEALTH } from '../constants/gameConfig.js'
import { isValidSave } from '../../security/validation/saveValidation.js'
import { discardHand, drawHand, startBattleDeck } from '../systems/deckSystem.js'
import { trackedLocalStorage } from './trackedStorage.js'
import { completeWorldDungeon, createWorldMapState } from '../systems/worldMapSystem.js'
import { getDefaultDiscoveredBlueprintIds } from '../systems/blueprintSystem.js'

const INITIAL_DISCOVERED_BLUEPRINT_IDS = getDefaultDiscoveredBlueprintIds()

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
  previousNodeId: null,
  floor: 1,
  prologueSeen: false,
  tutorialCompleted: false,
  tutorialMode: false,
  runStarted: false,
  uniqueBlockId: null,
  uniqueBlockChoiceIds: [],
  discoveredBlueprintIds: [...INITIAL_DISCOVERED_BLUEPRINT_IDS],
  developerMode,
  developerDifficulty: 1,
  battlePiles: { drawPile: [], hand: [], discardPile: [] },
  combat: {
    player: createCombatantState(),
    monster: createCombatantState(),
  },
  pendingBattle: null,
  deathCause: null,
})

const isUniqueBlock = (block) =>
  block.typeId === 'special' || block.tags?.includes('unique')

const keepFirstUniqueBlock = (blocks) => {
  let keptUnique = false
  return blocks.filter((block) => {
    if (!isUniqueBlock(block)) return true
    if (keptUnique) return false
    keptUnique = true
    return true
  })
}

const hasSavedBattlePiles = (piles) => piles
  && Array.isArray(piles.drawPile)
  && Array.isArray(piles.hand)
  && Array.isArray(piles.discardPile)
  && piles.drawPile.length + piles.hand.length + piles.discardPile.length > 0

const hydrateBattlePiles = (piles) => ({
  drawPile: piles.drawPile.map(hydrateBlock),
  hand: piles.hand.map(hydrateBlock),
  discardPile: piles.discardPile.map(hydrateBlock),
})

const createDeathCause = (state, cause, damage) => ({
  dungeonName: state.map?.dungeonName ?? null,
  floorNumber: state.floor,
  sourceName: cause.sourceName ?? null,
  effectName: cause.effectName ?? '피해',
  damage,
  causeType: cause.causeType ?? cause.sourceType ?? 'unknown',
})

const createRunStore = ({ storageName, developerMode, persistent = true }) => {
  const stateCreator = immer((set) => ({
  ...initialRun(developerMode),
  startRun: () => set((state) => {
    const prologueSeen = state.prologueSeen
    const tutorialCompleted = state.tutorialCompleted
    Object.assign(state, initialRun(developerMode))
    state.deck = createStarterDeck()
    state.uniqueBlockChoiceIds = createUniqueBlockChoiceIds()
    state.runStarted = true
    state.prologueSeen = prologueSeen
    state.tutorialCompleted = tutorialCompleted
  }),
  startTutorialRun: () => set((state) => {
    Object.assign(state, initialRun(false))
    state.deck = createTutorialDeck()
    state.discoveredBlueprintIds = [...INITIAL_DISCOVERED_BLUEPRINT_IDS]
    state.runStarted = true
    state.tutorialMode = true
  }),
  deleteRun: () => set((state) => {
    Object.assign(state, initialRun(developerMode))
  }),
  chooseUniqueBlock: (block) => set((state) => {
    if (state.uniqueBlockId || !state.uniqueBlockChoiceIds.includes(block.definitionId)) return
    state.deck.push(block)
    state.uniqueBlockId = block.definitionId
    state.uniqueBlockChoiceIds = []
  }),
  discoverBlueprints: (combinationIds) => set((state) => {
    const discovered = new Set(state.discoveredBlueprintIds)
    combinationIds.forEach((id) => discovered.add(id))
    state.discoveredBlueprintIds = [...discovered]
  }),
  selectNode: (node) => set((state) => {
    state.map = revealMapAroundNode(state.map, node.id)
    state.previousNodeId = state.currentNodeId
    state.currentNodeId = node.id
    state.floor = node.floor
  }),
  enterDungeon: (dungeon) => set((state) => {
    state.activeDungeonId = dungeon.id
    const difficulty = state.developerMode
      ? state.developerDifficulty
      : dungeon.difficulty
    const generatedMap = generateMap({
      dungeonId: dungeon.id,
      dungeonName: dungeon.name,
      difficulty,
    })
    const enteredFloor = enterFloorAtStart(generatedMap, 1)
    state.map = enteredFloor.map
    state.currentNodeId = enteredFloor.currentNodeId
    state.previousNodeId = null
    state.floor = 1
  }),
  leaveDungeon: () => set((state) => {
    state.activeDungeonId = null
    state.currentNodeId = null
    state.previousNodeId = null
  }),
  setDeveloperDifficulty: (difficulty) => set((state) => {
    if (!state.developerMode) return
    const normalized = Math.min(10, Math.max(1, Math.trunc(Number(difficulty) || 1)))
    state.developerDifficulty = normalized
    state.worldMap.dungeons.forEach((dungeon) => {
      dungeon.difficulty = normalized
    })
  }),
  completeDungeon: () => set((state) => {
    if (!state.activeDungeonId) return
    state.worldMap = completeWorldDungeon(state.worldMap, state.activeDungeonId)
    state.activeDungeonId = null
    state.currentNodeId = null
    state.previousNodeId = null
  }),
  moveToNode: (node) => set((state) => {
    state.map = revealMapAroundNode(state.map, node.id)
    state.previousNodeId = state.currentNodeId
    state.currentNodeId = node.id
    state.floor = node.floor
  }),
  returnToPreviousNode: () => set((state) => {
    const previous = findMapNode(state.map, state.previousNodeId)
    if (!previous) return
    const abandonedNodeId = state.currentNodeId
    state.map = revealMapAroundNode(state.map, previous.id)
    state.currentNodeId = previous.id
    state.previousNodeId = abandonedNodeId
    state.floor = previous.floor
  }),
  completeNode: () => set((state) => {
    const completedNode = findMapNode(state.map, state.currentNodeId)
    state.map = completeAndUnlockNext(state.map, state.currentNodeId)
    if (completedNode?.type === 'stairs') {
      state.floor = completedNode.floor + 1
      const enteredFloor = enterFloorAtStart(state.map, state.floor)
      state.map = enteredFloor.map
      state.currentNodeId = enteredFloor.currentNodeId
      state.previousNodeId = null
    }
  }),
  damagePlayer: (amount, attackerStatuses = [], cause = {}) => set((state) => {
    const healthBeforeDamage = state.health
    const adjustedAmount = calculateGeneralDamage({
      amount,
      attackerStatuses,
      defenderStatuses: state.combat.player.statuses,
    })
    const absorbed = Math.min(state.armor, adjustedAmount)
    state.armor -= absorbed
    const healthDamage = Math.max(0, adjustedAmount - absorbed)
    state.health = Math.max(0, state.health - healthDamage)
    if (healthBeforeDamage > 0 && state.health <= 0) {
      state.deathCause = createDeathCause(
        state,
        cause,
        Math.min(healthBeforeDamage, healthDamage),
      )
    }
  }),
  damagePlayerIgnoringArmor: (amount, cause = {}) => set((state) => {
    const healthBeforeDamage = state.health
    const healthDamage = Math.max(0, amount)
    state.health = Math.max(0, state.health - healthDamage)
    if (healthBeforeDamage > 0 && state.health <= 0) {
      state.deathCause = createDeathCause(
        state,
        cause,
        Math.min(healthBeforeDamage, healthDamage),
      )
    }
  }),
  clearArmor: () => set((state) => { state.armor = 0 }),
  retainArmorNextTurn: () => set((state) => {
    state.combat.player.retainArmorNextTurn = true
  }),
  resolveArmorTurnEnd: () => set((state) => {
    if (state.combat.player.retainArmorNextTurn) {
      state.combat.player.retainArmorNextTurn = false
      return
    }
    state.armor = 0
  }),
  gainArmor: (amount) => set((state) => { state.armor += Math.max(0, amount) }),
  addGold: (amount) => set((state) => { state.gold = Math.max(0, state.gold + amount) }),
  addBlock: (block) => set((state) => {
    if (isUniqueBlock(block)) {
      if (state.uniqueBlockId) return
      state.uniqueBlockId = block.definitionId
      state.uniqueBlockChoiceIds = []
    }
    state.deck.push(block)
  }),
  removeBlock: (id) => set((state) => { state.deck = state.deck.filter((block) => block.id !== id) }),
  replaceBlock: (id, block) => set((state) => {
    const index = state.deck.findIndex((entry) => entry.id === id)
    if (index < 0 || block.id !== id) return
    state.deck[index] = block
  }),
  heal: (amount) => set((state) => { state.health = Math.min(state.maxHealth, state.health + amount) }),
  gainMaxHealth: (amount) => set((state) => { state.maxHealth += amount; state.health += amount }),
  applyCombatStatus: (target, statusOrId, stacks, newlyApplied = false) => set((state) => {
    if (!state.combat[target]) return
    state.combat[target].statuses = typeof statusOrId === 'string'
      ? addStatus(state.combat[target].statuses, statusOrId, stacks, newlyApplied)
      : addStatusUpdate(state.combat[target].statuses, statusOrId, newlyApplied)
  }),
  consumeCombatStatus: (target, statusId) => set((state) => {
    if (!state.combat[target]) return
    state.combat[target].statuses = consumeOneShotStatus(
      state.combat[target].statuses,
      statusId,
    )
  }),
  resolvePlayerTurnEndStatuses: (placedCount) => set((state) => {
    const healthBeforeStatuses = state.health
    const result = resolveTurnEndStatuses({
      health: state.health,
      armor: state.armor,
      statuses: state.combat.player.statuses,
      playerPlacedBlockCount: placedCount,
    })
    state.health = result.health
    state.armor = result.armor
    state.combat.player.statuses = result.statuses
    const lethalEvent = result.damageEvents.find(({ healthAfter }) => healthAfter <= 0)
    if (healthBeforeStatuses > 0 && lethalEvent) {
      state.deathCause = createDeathCause(state, {
        sourceName: lethalEvent.sourceName,
        effectName: STATUS_EFFECTS[lethalEvent.statusId]?.name ?? lethalEvent.statusId,
        causeType: 'status',
      }, lethalEvent.damage)
    }
  }),
  markPrologueSeen: () => set((state) => { state.prologueSeen = true }),
  markTutorialCompleted: () => set((state) => { state.tutorialCompleted = true }),
  beginBattle: (encounter) => set((state) => {
    const initialBattlePiles = state.tutorialMode
      ? { drawPile: state.deck.slice(HAND_SIZE), hand: state.deck.slice(0, HAND_SIZE), discardPile: [] }
      : drawHand(startBattleDeck(state.deck))
    state.pendingBattle = {
      encounter,
      health: state.health,
      maxHealth: state.maxHealth,
      armor: state.armor,
      gold: state.gold,
      deck: state.deck,
      battlePiles: initialBattlePiles,
    }
    state.battlePiles = initialBattlePiles
    state.deathCause = null
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
    state.deathCause = null
    state.battlePiles = hasSavedBattlePiles(snapshot.battlePiles)
      ? snapshot.battlePiles
      : drawHand(startBattleDeck(snapshot.deck))
    state.combat = {
      player: createCombatantState(),
      monster: createCombatantState(),
    }
  }),
  clearPendingBattle: () => set((state) => { state.pendingBattle = null }),
  drawNextHand: (extraCount = 0, shuffleEveryTurn = false) => set((state) => {
    const discarded = discardHand(state.battlePiles)
    const piles = shuffleEveryTurn
      ? startBattleDeck([...discarded.drawPile, ...discarded.discardPile])
      : discarded
    state.battlePiles = drawHand(piles, HAND_SIZE + Math.max(0, extraCount))
  }),
  }))
  if (!persistent) return createStore(stateCreator)
  return createStore(persist(stateCreator, {
  name: storageName,
  storage: createJSONStorage(() => trackedLocalStorage),
  partialize: ({ health, maxHealth, gold, deck, map, worldMap, activeDungeonId, currentNodeId, previousNodeId, floor, prologueSeen, tutorialCompleted, runStarted, developerMode, developerDifficulty, pendingBattle, battlePiles, uniqueBlockId, uniqueBlockChoiceIds, discoveredBlueprintIds, deathCause }) =>
    ({ health, maxHealth, gold, deck, map, worldMap, activeDungeonId, currentNodeId, previousNodeId, floor, prologueSeen, tutorialCompleted, runStarted, developerMode, developerDifficulty, pendingBattle, battlePiles, uniqueBlockId, uniqueBlockChoiceIds, discoveredBlueprintIds, deathCause }),
  merge: (persisted, current) => {
    if (!isValidSave(persisted)) return current
    const hydratedDeck = persisted.deck.map(hydrateBlock)
    const uniqueBlocks = hydratedDeck.filter(isUniqueBlock)
    const uniqueBlockId = persisted.uniqueBlockId ?? uniqueBlocks[0]?.definitionId ?? null
    const deck = keepFirstUniqueBlock(hydratedDeck)
    const pendingBattle = persisted.pendingBattle
      ? {
          ...persisted.pendingBattle,
          deck: keepFirstUniqueBlock(
            (persisted.pendingBattle.deck ?? persisted.deck).map(hydrateBlock),
          ),
          ...(hasSavedBattlePiles(persisted.pendingBattle.battlePiles)
            ? { battlePiles: hydrateBattlePiles(persisted.pendingBattle.battlePiles) }
            : {}),
        }
      : null
    const battlePiles = hasSavedBattlePiles(persisted.battlePiles)
      ? hydrateBattlePiles(persisted.battlePiles)
      : pendingBattle?.battlePiles ?? current.battlePiles
    const worldMap = persisted.worldMap
      ? {
          ...persisted.worldMap,
          dungeons: persisted.worldMap.dungeons.map((dungeon) => {
            const currentDungeon = current.worldMap.dungeons.find(({ id }) => id === dungeon.id)
            return {
              ...dungeon,
              name: currentDungeon?.name ?? dungeon.name,
              ...(dungeon.kind === 'final' && dungeon.status === 'locked'
                ? { status: 'available' }
                : {}),
            }
          }),
        }
      : current.worldMap
    const developerDifficulty = developerMode
      ? Math.min(10, Math.max(1, Math.trunc(Number(persisted.developerDifficulty) || 1)))
      : 1
    if (developerMode) {
      worldMap.dungeons = worldMap.dungeons.map((dungeon) => ({
        ...dungeon,
        difficulty: developerDifficulty,
      }))
    }
    return {
      ...current,
      ...persisted,
      map: persisted.activeDungeonId && persisted.map
        ? {
            ...persisted.map,
            dungeonName: worldMap.dungeons.find(({ id }) =>
              id === persisted.activeDungeonId)?.name ?? persisted.map.dungeonName,
          }
        : persisted.map ?? current.map,
      deck,
      worldMap,
      pendingBattle,
      battlePiles,
      developerMode,
      developerDifficulty,
      uniqueBlockId,
      uniqueBlockChoiceIds: uniqueBlockId ? [] : (persisted.uniqueBlockChoiceIds?.length
        ? persisted.uniqueBlockChoiceIds
        : createUniqueBlockChoiceIds()),
      discoveredBlueprintIds: [...new Set([
        ...INITIAL_DISCOVERED_BLUEPRINT_IDS,
        ...(Array.isArray(persisted.discoveredBlueprintIds) ? persisted.discoveredBlueprintIds : []),
      ])],
    }
  },
  }))
}

export const normalRunStore = createRunStore({
  storageName: 'blockable-save-v1',
  developerMode: false,
})

export const developerRunStore = createRunStore({
  storageName: 'blockable-developer-save-v1',
  developerMode: true,
})

export const tutorialRunStore = createRunStore({
  storageName: 'blockable-tutorial-session-v1',
  developerMode: false,
  persistent: false,
})

if (typeof localStorage !== 'undefined') {
  localStorage.removeItem('blockable-tutorial-session-v1')
}
