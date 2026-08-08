import Phaser from 'phaser'
import { BOARD_CELLS, BOARD_CELL_GAP, HAND_BLOCK_CELL_GAP, HAND_BLOCK_CELL_SIZE, PLACEMENTS_PER_TURN } from '../../constants/gameConfig.js'
import { GAME_EVENTS, gameBridge } from '../../events/gameEvents.js'
import { canPlaceAnotherBlock, canPlaceBlock, cellKey, getActiveBoardCellCount, getPlacedCells } from '../../systems/boardPlacementSystem.js'
import {
  describeFinalBlockEffects,
  getDominantCombinationColor,
  resolveBlockEffects,
} from '../../systems/blockEffectSystem.js'
import { findMatchingCombinations } from '../../systems/blockCombinationSystem.js'
import { getQuickCombinationPlan } from '../../systems/blueprintSystem.js'
import { getBlockAnchorOffset, getBlockVisualBounds, gridToWorld, isPointInsideBlock, layoutBlockForBoard, layoutBlockForHand, worldToGrid } from '../layout/blockLayout.js'
import { cycleStandardBlockColor } from '../../../objects/blocks/blockData.js'
import { resolveCombatFormulaPreview } from '../../systems/combatFormulaPreviewSystem.js'
import curseTexture from '../../../assets/sprites/blocks/block_curse.png'
import fireTexture from '../../../assets/sprites/blocks/block_fire.png'
import legendTexture from '../../../assets/sprites/blocks/block_legend.png'
import natureTexture from '../../../assets/sprites/blocks/block_nature.png'
import specialTexture from '../../../assets/sprites/blocks/block_special.png'
import steelTexture from '../../../assets/sprites/blocks/block_steel.png'
import waterTexture from '../../../assets/sprites/blocks/block_water.png'
import formworkTexture from '../../../screens/battle/assets/pictures/formwork_alpha.png'

const FORMWORK_DISPLAY_SIZE = 800
const FORMWORK_TEXTURE_SIZE = 700
const FORMWORK_TEXTURE_CELL_PITCH = 110
const FORMWORK_SCALE = FORMWORK_DISPLAY_SIZE / FORMWORK_TEXTURE_SIZE
const BOARD_METRICS = {
  originX: 10 + 240 * FORMWORK_SCALE,
  originY: 10 + 240 * FORMWORK_SCALE,
  cellSize: FORMWORK_TEXTURE_CELL_PITCH * FORMWORK_SCALE,
  gap: BOARD_CELL_GAP * FORMWORK_SCALE,
}
const HAND_METRICS = { cellSize: HAND_BLOCK_CELL_SIZE, gap: HAND_BLOCK_CELL_GAP }
const BATTLE_STAGE_WIDTH = 820
const ANVIL_SLOT_X_RATIOS = [195 / 670, 295 / 670, 400 / 670, 505 / 670, 610 / 670]
const ANVIL_SLOT_Y_RATIO = 97 / 161
const ANVIL_CENTER_Y = 1142
const ANVIL_DISPLAY_HEIGHT = 390
const FORMWORK_GRID_SIZE = 5
const BOARD_CENTER = gridToWorld(1, 1, BOARD_METRICS)
const EFFECT_SUMMARY_X = 560
const EFFECT_SUMMARY_BOTTOM = 805
const EFFECT_SUMMARY_WIDTH = BATTLE_STAGE_WIDTH - EFFECT_SUMMARY_X - 8
const ANVIL_TOP_Y = ANVIL_CENTER_Y - ANVIL_DISPLAY_HEIGHT / 2
const HAND_SURFACE_Y = ANVIL_TOP_Y - 8
const COLORS = { neutral: 0xb9b5ad, ghost: 0x6f5a42, valid: 0x91c99c, placed: 0xb94a42, invalid: 0x8c8177 }
const STROKES = {
  hand: { width: 2, color: 0xe7e0d3 },
  preview: { width: 3, color: 0xf3eee5 },
  placed: { width: 3, color: 0x5c1815 },
  latest: { width: 6, color: 0xffffff },
}
const DRAG_ALPHA = 0.58
const BLOCK_TEXTURES = {
  curse: { key: 'block-curse', url: curseTexture },
  fire: { key: 'block-fire', url: fireTexture },
  legendary: { key: 'block-legend', url: legendTexture },
  nature: { key: 'block-nature', url: natureTexture },
  special: { key: 'block-special', url: specialTexture },
  steel: { key: 'block-steel', url: steelTexture },
  water: { key: 'block-water', url: waterTexture },
}
const COMBINATION_NAME_COLORS = {
  fire: '#ef6a4a',
  nature: '#69bd72',
  water: '#69aef5',
}
const COMBINATION_GLOW_COLORS = [
  { core: 0xff8a32, glow: 0xd83b16 },
  { core: 0x72d9ff, glow: 0x176fc9 },
]
const FORMWORK_AURA_COLORS = {
  legendary: 0xf2b84f,
  special: 0x2de2d1,
  fire: 0xe34e2d,
  nature: 0x68ae58,
  water: 0x4c9ee8,
  steel: 0xb9b7ae,
}

const boundaryPointKey = ({ x, y }) => `${x},${y}`

const rotateQuickCell = ({ x, y }, width, height, turns) => {
  switch (turns % 4) {
    case 1: return { x: height - 1 - y, y: x }
    case 2: return { x: width - 1 - x, y: height - 1 - y }
    case 3: return { x: y, y: width - 1 - x }
    default: return { x, y }
  }
}

const getRotatedQuickLayoutSize = ({ width, height }, turns) =>
  turns % 2 ? { width: height, height: width } : { width, height }

const getClockwiseBoundaryLoops = (cells) => {
  const cellKeys = new Set(cells.map(({ x, y }) => `${x},${y}`))
  const segments = cells.flatMap(({ x, y }) => [
    !cellKeys.has(`${x},${y - 1}`) && { start: { x: x - 0.5, y: y - 0.5 }, end: { x: x + 0.5, y: y - 0.5 } },
    !cellKeys.has(`${x + 1},${y}`) && { start: { x: x + 0.5, y: y - 0.5 }, end: { x: x + 0.5, y: y + 0.5 } },
    !cellKeys.has(`${x},${y + 1}`) && { start: { x: x + 0.5, y: y + 0.5 }, end: { x: x - 0.5, y: y + 0.5 } },
    !cellKeys.has(`${x - 1},${y}`) && { start: { x: x - 0.5, y: y + 0.5 }, end: { x: x - 0.5, y: y - 0.5 } },
  ].filter(Boolean))
  const remaining = new Set(segments)
  const loops = []
  while (remaining.size) {
    const first = remaining.values().next().value
    const loop = [first]
    remaining.delete(first)
    let endKey = boundaryPointKey(first.end)
    const startKey = boundaryPointKey(first.start)
    while (endKey !== startKey) {
      const next = [...remaining].find(({ start }) => boundaryPointKey(start) === endKey)
      if (!next) break
      loop.push(next)
      remaining.delete(next)
      endKey = boundaryPointKey(next.end)
    }
    loops.push(loop)
  }
  return loops
}

const getBoundaryWorldPoint = (loop, progress) => {
  const normalized = ((progress % 1) + 1) % 1
  const scaled = normalized * loop.length
  const segment = loop[Math.min(loop.length - 1, Math.floor(scaled))]
  const amount = scaled - Math.floor(scaled)
  return {
    x: BOARD_METRICS.originX
      + Phaser.Math.Linear(segment.start.x, segment.end.x, amount) * BOARD_METRICS.cellSize,
    y: BOARD_METRICS.originY
      + Phaser.Math.Linear(segment.start.y, segment.end.y, amount) * BOARD_METRICS.cellSize,
  }
}

export class BattleScene extends Phaser.Scene {
  constructor() { super('battle') }

  init(data) {
    this.hand = data.hand ?? []
    this.developerMode = data.developerMode === true
    this.tutorialMode = data.tutorialMode === true
    this.knownBlueprintIds = new Set(data.knownBlueprintIds ?? [])
    this.currentArmor = Number(data.armor ?? 0)
    this.combatFormulaContext = {
      damageBonus: 0,
      attackMultiplier: 1,
      attackReductionMultiplier: 1,
      woundMultiplier: 1,
      hitCountBonus: 0,
    }
    this.activeCellCount = getActiveBoardCellCount(data.health ?? 75, BOARD_CELLS.length)
    this.occupied = new Map()
    this.pieces = []
    this.handSlots = this.hand.map((block, index) => ({
      x: 0,
      bounds: getBlockVisualBounds(layoutBlockForHand(block, 0, HAND_METRICS)),
    }))
    this.selected = null
    this.quickCombinationPreview = null
    this.placementOrder = 0
    this.unsubReset = null
    this.unsubInput = null
    this.unsubQuickCombination = null
    this.unsubQuickCombinationPreview = null
    this.unsubQuickCombinationPreviewClear = null
    this.unsubHealthChanged = null
    this.unsubArmorChanged = null
    this.unsubCombatContextChanged = null
    this.inputEnabled = true
    this.handleWindowKeyDown = (event) => {
      if (!this.inputEnabled) return
      if (event.code === 'KeyR' && this.quickCombinationPreview) {
        event.preventDefault()
        this.rotateQuickCombinationPreview()
      } else if (event.code === 'KeyR' && this.selected) {
        event.preventDefault()
        this.rotateSelected()
      }
      if (event.code === 'KeyZ' && this.developerMode && !this.selected) {
        this.cycleLatestPlacedBlockColor()
      }
    }
  }

  getPlacementLimit() {
    const placedBlocks = this.pieces
      .filter(({ placed }) => placed)
      .map((piece) => ({
        block: piece.block,
        cells: getPlacedCells(
          piece.block.cells,
          piece.rotation,
          piece.boardX,
          piece.boardY,
        ).map(([x, y]) => ({ x, y })),
      }))
    const bonus = resolveBlockEffects(placedBlocks, { currentArmor: this.currentArmor })
      .placementCountChanges
      .reduce((sum, effect) => sum + Math.max(0, effect.value), 0)
    return PLACEMENTS_PER_TURN + bonus
  }

  preload() {
    Object.values(BLOCK_TEXTURES).forEach(({ key, url }) => this.load.image(key, url))
    this.load.image('battle-formwork', formworkTexture)
  }

  create() {
    this.cameras.main.setBackgroundColor('rgba(0,0,0,0)')
    this.drawBoard()
    this.handContainer = this.add.container(0, 0).setDepth(1)
    this.quickCombinationGhost = this.add.container(0, 0).setDepth(19).setVisible(false)
    this.hand.forEach((block, index) => this.createPiece(block, index))
    this.refreshHandSlotPositions()
    window.addEventListener('keydown', this.handleWindowKeyDown)
    this.input.on('pointerdown', this.selectPieceAtPointer, this)
    this.input.on('pointermove', this.moveSelected, this)
    this.input.on('pointerup', this.releaseSelected, this)
    this.input.on('pointerupoutside', this.releaseSelectedOutside, this)
    this.handleWindowPointerUp = this.handleWindowPointerUp.bind(this)
    this.refreshHandSlotPositions = this.refreshHandSlotPositions.bind(this)
    window.addEventListener('pointerup', this.handleWindowPointerUp)
    window.addEventListener('resize', this.refreshHandSlotPositions)
    this.unsubReset = gameBridge.on(GAME_EVENTS.RESET_BOARD, () => this.resetBoard())
    this.unsubHealthChanged = gameBridge.on(
      GAME_EVENTS.BOARD_HEALTH_CHANGED,
      ({ health }) => this.updateActiveBoardCells(health),
    )
    this.unsubArmorChanged = gameBridge.on(
      GAME_EVENTS.BOARD_ARMOR_CHANGED,
      ({ armor }) => {
        this.currentArmor = Number(armor ?? 0)
        this.emitBoardState()
      },
    )
    this.unsubCombatContextChanged = gameBridge.on(
      GAME_EVENTS.BOARD_COMBAT_CONTEXT_CHANGED,
      (context) => {
        this.combatFormulaContext = { ...this.combatFormulaContext, ...context }
        this.emitBoardState()
      },
    )
    this.unsubQuickCombination = gameBridge.on(
      GAME_EVENTS.QUICK_COMBINATION_DROP,
      (payload) => this.placeQuickCombination(payload),
    )
    this.unsubQuickCombinationPreview = gameBridge.on(
      GAME_EVENTS.QUICK_COMBINATION_PREVIEW,
      (payload) => this.previewQuickCombination(payload),
    )
    this.unsubQuickCombinationPreviewClear = gameBridge.on(
      GAME_EVENTS.QUICK_COMBINATION_PREVIEW_CLEAR,
      () => this.clearQuickCombinationPreview(),
    )
    this.unsubInput = gameBridge.on(GAME_EVENTS.SET_INPUT_ENABLED, (enabled) => {
      this.inputEnabled = enabled
      this.input.enabled = enabled
      if (this.input.keyboard) this.input.keyboard.enabled = enabled
    })
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener('keydown', this.handleWindowKeyDown)
      this.input.off('pointerdown', this.selectPieceAtPointer, this)
      this.input.off('pointermove', this.moveSelected, this)
      this.input.off('pointerup', this.releaseSelected, this)
      this.input.off('pointerupoutside', this.releaseSelectedOutside, this)
      window.removeEventListener('pointerup', this.handleWindowPointerUp)
      window.removeEventListener('resize', this.refreshHandSlotPositions)
      this.unsubReset?.()
      this.unsubInput?.()
      this.unsubQuickCombination?.()
      this.unsubQuickCombinationPreview?.()
      this.unsubQuickCombinationPreviewClear?.()
      this.unsubHealthChanged?.()
      this.unsubArmorChanged?.()
      this.unsubCombatContextChanged?.()
    })
    this.emitBoardState()
  }

  drawBoard() {
    this.activeCells = BOARD_CELLS.slice(0, this.activeCellCount)
    this.activeCellKeys = new Set(this.activeCells.map(cellKey))
    this.boardCellBackgrounds = new Map()
    const hasFormworkTexture = this.textures.exists('battle-formwork')
    if (hasFormworkTexture) {
      this.add.image(BOARD_CENTER.x, BOARD_CENTER.y, 'battle-formwork')
        .setDisplaySize(FORMWORK_DISPLAY_SIZE, FORMWORK_DISPLAY_SIZE)
        .setDepth(-2)
    }

    this.activeCells.forEach(([column, row]) => {
      const world = gridToWorld(row, column, BOARD_METRICS)
      const background = this.add.rectangle(world.x, world.y, BOARD_METRICS.cellSize - BOARD_METRICS.gap, BOARD_METRICS.cellSize - BOARD_METRICS.gap, COLORS.ghost, hasFormworkTexture ? 0.08 : 0.34)
        .setStrokeStyle(2, 0xc9a976, 0.4)
        .setDepth(-1)
      this.boardCellBackgrounds.set(cellKey([column, row]), background)
    })
    this.drawMinimumFormworkBoundary()
    this.combinationGlowContainer = this.add.container(0, 0).setDepth(8)
    this.createFormworkAura()
    this.drawDisabledFormworkCells()
  }

  drawMinimumFormworkBoundary() {
    const topLeft = gridToWorld(0, 0, BOARD_METRICS)
    const size = BOARD_METRICS.cellSize * 3
    const x = topLeft.x - BOARD_METRICS.cellSize / 2
    const y = topLeft.y - BOARD_METRICS.cellSize / 2
    const border = this.add.graphics().setDepth(2)
    border.lineStyle(7, 0x24140e, 0.72)
    border.strokeRect(x, y, size, size)
    border.lineStyle(3, 0x875034, 0.82)
    border.strokeRect(x, y, size, size)
    border.lineStyle(2, 0xc07843, 0.65)
    const rustMarks = [
      [0.04, 0, 0.18, 0], [0.54, 0, 0.69, 0], [0.86, 0, 0.95, 0],
      [0.11, 1, 0.27, 1], [0.46, 1, 0.58, 1], [0.78, 1, 0.91, 1],
    ]
    rustMarks.forEach(([start, edge, end]) => {
      const lineY = edge ? y + size : y
      border.lineBetween(x + size * start, lineY, x + size * end, lineY)
    })
    border.lineBetween(x, y + size * 0.18, x, y + size * 0.38)
    border.lineBetween(x, y + size * 0.72, x, y + size * 0.87)
    border.lineBetween(x + size, y + size * 0.08, x + size, y + size * 0.24)
    border.lineBetween(x + size, y + size * 0.57, x + size, y + size * 0.78)
  }

  drawCombinationGlows(matches) {
    this.combinationFlowTweens?.forEach((tween) => tween.remove())
    this.combinationFlowTweens = []
    this.combinationGlowContainer?.each((child) => this.tweens.killTweensOf(child))
    this.combinationGlowContainer?.removeAll(true)
    matches.forEach(({ participatingBlocks }, index) => {
      const palette = COMBINATION_GLOW_COLORS[index % COMBINATION_GLOW_COLORS.length]
      const cells = participatingBlocks.flatMap(({ cells }) => cells)
      const cellKeys = new Set(cells.map(({ x, y }) => `${x},${y}`))
      const glow = this.add.graphics()
      const drawEdges = () => {
        cells.forEach(({ x, y }) => {
          const world = gridToWorld(y, x, BOARD_METRICS)
          const half = BOARD_METRICS.cellSize / 2
          if (!cellKeys.has(`${x},${y - 1}`)) glow.lineBetween(world.x - half, world.y - half, world.x + half, world.y - half)
          if (!cellKeys.has(`${x + 1},${y}`)) glow.lineBetween(world.x + half, world.y - half, world.x + half, world.y + half)
          if (!cellKeys.has(`${x},${y + 1}`)) glow.lineBetween(world.x + half, world.y + half, world.x - half, world.y + half)
          if (!cellKeys.has(`${x - 1},${y}`)) glow.lineBetween(world.x - half, world.y + half, world.x - half, world.y - half)
        })
      }
      glow.lineStyle(10, palette.glow, 0.26)
      drawEdges()
      glow.lineStyle(5, palette.glow, 0.72)
      drawEdges()
      glow.lineStyle(2, palette.core, 1)
      drawEdges()
      this.combinationGlowContainer.add(glow)
      this.tweens.add({
        targets: glow,
        alpha: { from: 0.72, to: 1 },
        duration: 520 + index * 90,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.InOut',
      })
      getClockwiseBoundaryLoops(cells).forEach((loop) => {
        const trail = [0, 1, 2].map((trailIndex) => {
          const particle = this.add.image(0, 0, 'combination-flow-particle')
            .setTint(palette.core)
            .setBlendMode(Phaser.BlendModes.ADD)
            .setScale(1 - trailIndex * 0.2)
            .setAlpha(1 - trailIndex * 0.3)
          this.combinationGlowContainer.add(particle)
          return particle
        })
        const state = { progress: 0 }
        const updateTrail = () => {
          trail.forEach((particle, trailIndex) => {
            const point = getBoundaryWorldPoint(loop, state.progress - trailIndex * 0.018)
            particle.setPosition(point.x, point.y)
          })
        }
        updateTrail()
        const tween = this.tweens.add({
          targets: state,
          progress: 1,
          duration: Math.max(1100, loop.length * 150),
          repeat: -1,
          onUpdate: updateTrail,
        })
        this.combinationFlowTweens.push(tween)
      })
    })
  }

  createFormworkAura() {
    if (!this.textures.exists('combination-flow-particle')) {
      const flowSource = this.make.graphics({ x: 0, y: 0, add: false })
      flowSource.fillStyle(0xffffff, 0.12)
      flowSource.fillCircle(9, 9, 8)
      flowSource.fillStyle(0xffffff, 0.45)
      flowSource.fillCircle(9, 9, 4)
      flowSource.fillStyle(0xffffff, 1)
      flowSource.fillCircle(9, 9, 1.6)
      flowSource.generateTexture('combination-flow-particle', 18, 18)
      flowSource.destroy()
    }
    Object.entries(FORMWORK_AURA_COLORS).forEach(([auraName, auraColor]) => {
      const textureKey = `formwork-aura-${auraName}`
      if (this.textures.exists(textureKey)) return
      const source = this.make.graphics({ x: 0, y: 0, add: false })
      source.fillStyle(auraColor, 0.1)
      source.fillEllipse(48, 32, 92, 54)
      source.fillStyle(auraColor, 0.16)
      source.fillEllipse(31, 34, 50, 42)
      source.fillEllipse(65, 27, 48, 38)
      source.fillStyle(auraColor, 0.27)
      source.fillEllipse(48, 32, 38, 27)
      source.generateTexture(textureKey, 96, 64)
      source.destroy()
    })
    const half = FORMWORK_DISPLAY_SIZE / 2
    const particles = [
      [-0.38, -1, -12, -22], [0, -1, 5, -25], [0.38, -1, 13, -20],
      [-0.38, 1, -10, 22], [0, 1, 4, 26], [0.38, 1, 14, 20],
      [-1, -0.38, -22, -10], [-1, 0, -26, 5], [-1, 0.38, -20, 13],
      [1, -0.38, 22, -12], [1, 0, 26, 4], [1, 0.38, 20, 14],
    ]
    this.formworkAuraParticles = particles.map(([edgeX, edgeY, driftX, driftY], index) => {
      const baseX = BOARD_CENTER.x + edgeX * (half + 12)
      const baseY = BOARD_CENTER.y + edgeY * (half + 12)
      const image = this.add.image(baseX, baseY, 'formwork-aura-steel')
        .setDepth(3)
        .setBlendMode(Phaser.BlendModes.NORMAL)
        .setScale(0.68 + (index % 4) * 0.12)
        .setAlpha(0)
        .setVisible(false)
      this.tweens.add({
        targets: image,
        x: baseX + driftX,
        y: baseY + driftY,
        alpha: { from: 0.12, to: 0.62 },
        scale: image.scale * 1.35,
        duration: 1500 + (index % 3) * 240,
        delay: index * 95,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.InOut',
      })
      return image
    })
  }

  updateFormworkAura(placedBlocks) {
    const colors = placedBlocks
      .map(({ block }) => block.color)
      .filter((color) => color !== 'curse')
    let auraName = null
    if (colors.includes('legendary')) auraName = 'legendary'
    else if (colors.includes('special')) auraName = 'special'
    else {
      const normalBlocks = placedBlocks.filter(({ block }) =>
        ['steel', 'water', 'nature', 'fire'].includes(block.color))
      if (normalBlocks.length) {
        auraName = getDominantCombinationColor(normalBlocks) ?? 'steel'
      }
    }
    this.formworkAuraParticles?.forEach((particle) => {
      particle.setVisible(auraName !== null)
      if (auraName !== null) particle.setTexture(`formwork-aura-${auraName}`)
    })
  }

  createEffectSummary() {
    this.formworkSummaryContainer = this.add.container(
      EFFECT_SUMMARY_X,
      EFFECT_SUMMARY_BOTTOM,
    ).setDepth(28)
  }

  renderEffectSummary(
    effectValues,
    combinationDetails,
    colorSynergyLabels = [],
    combatFormulaLines = [],
  ) {
    const container = this.formworkSummaryContainer
    if (!container) return
    container.removeAll(true)
    const padding = 8
    const contentWidth = EFFECT_SUMMARY_WIDTH - padding * 2
    const labelStyle = {
      fontFamily: 'DNF Forged Blade Medium',
      fontSize: '9px',
      color: '#b98754',
      letterSpacing: 1,
    }
    const textStyle = {
      fontFamily: 'DNF Forged Blade Medium',
      fontSize: '12px',
      lineSpacing: 3,
      color: '#f1dfc2',
      stroke: '#080604',
      strokeThickness: 2,
      wordWrap: { width: contentWidth },
    }
    let cursorY = padding
    if (colorSynergyLabels.length) {
      const synergyLabel = this.add.text(padding, cursorY, '속성 시너지', labelStyle)
      container.add(synergyLabel)
      cursorY += synergyLabel.height + 3
      colorSynergyLabels.forEach(({ color, text: value }) => {
        const synergyText = this.add.text(padding, cursorY, value, {
          ...textStyle,
          color: COMBINATION_NAME_COLORS[color] ?? '#f1dfc2',
        })
        container.add(synergyText)
        cursorY += synergyText.height + 2
      })
      cursorY += 4
    }
    const finalLabel = this.add.text(padding, cursorY, '최종 적용', labelStyle)
    container.add(finalLabel)
    cursorY += finalLabel.height + 3
    const finalText = this.add.text(
      padding,
      cursorY,
      effectValues || '적용 효과 없음',
      textStyle,
    )
    container.add(finalText)
    cursorY += finalText.height + 7

    if (combatFormulaLines.length) {
      const formulaLabel = this.add.text(padding, cursorY, '개발자 전투 계산', labelStyle)
      container.add(formulaLabel)
      cursorY += formulaLabel.height + 3
      combatFormulaLines.forEach((line) => {
        const formulaText = this.add.text(padding, cursorY, line, {
          ...textStyle,
          fontSize: '9px',
          color: '#d8c3a1',
        })
        container.add(formulaText)
        cursorY += formulaText.height + 2
      })
      cursorY += 4
    }

    const divider = this.add.graphics()
    divider.lineStyle(1, 0x8f5b32, 0.9)
    divider.lineBetween(padding, cursorY, EFFECT_SUMMARY_WIDTH - padding, cursorY)
    divider.lineStyle(3, 0xd25a2d, 0.18)
    divider.lineBetween(padding, cursorY, EFFECT_SUMMARY_WIDTH - padding, cursorY)
    container.add(divider)
    cursorY += 6

    const combinationLabel = this.add.text(padding, cursorY, '발동 조합', labelStyle)
    container.add(combinationLabel)
    cursorY += combinationLabel.height + 3
    combinationDetails.forEach(({ name, color, effects: appliedEffects }) => {
      const nameText = this.add.text(padding, cursorY, name, {
        ...textStyle,
        color: COMBINATION_NAME_COLORS[color] ?? '#f1dfc2',
      })
      container.add(nameText)
      const effectValue = appliedEffects.length ? `· ${appliedEffects.join(', ')}` : ''
      if (!effectValue) {
        cursorY += nameText.height + 3
        return
      }
      const effectText = this.add.text(
        padding + nameText.width + 4,
        cursorY,
        effectValue,
        { ...textStyle, wordWrap: { width: Math.max(1, contentWidth - nameText.width - 4) } },
      )
      if (nameText.width + effectText.width + 4 > contentWidth
        || contentWidth - nameText.width - 4 < 70) {
        effectText.setPosition(padding, cursorY + nameText.height)
        effectText.setWordWrapWidth(contentWidth)
        cursorY += nameText.height + effectText.height + 3
      } else {
        cursorY += Math.max(nameText.height, effectText.height) + 3
      }
      container.add(effectText)
    })
    const height = cursorY + padding - 3
    const panel = this.add.rectangle(0, 0, EFFECT_SUMMARY_WIDTH, height, 0x0d0a08, 0.98)
      .setOrigin(0, 0)
      .setStrokeStyle(2, 0xb47a43, 1)
    container.addAt(panel, 0)
    container.setY(EFFECT_SUMMARY_BOTTOM - height)
  }

  drawDisabledFormworkCells() {
    this.disabledCellContainer?.destroy(true)
    this.disabledCellContainer = this.add.container(0, 0).setDepth(0)
    for (let formworkRow = 0; formworkRow < FORMWORK_GRID_SIZE; formworkRow += 1) {
      for (let formworkColumn = 0; formworkColumn < FORMWORK_GRID_SIZE; formworkColumn += 1) {
        const column = formworkColumn - 1
        const row = formworkRow - 1
        if (this.activeCellKeys.has(cellKey([column, row]))) continue
        const world = gridToWorld(row, column, BOARD_METRICS)
        const cover = this.add.rectangle(
          world.x,
          world.y,
          BOARD_METRICS.cellSize - BOARD_METRICS.gap,
          BOARD_METRICS.cellSize - BOARD_METRICS.gap,
          0x090807,
          0.68,
        ).setStrokeStyle(2, 0x3e332a, 0.9)
        const label = this.add.text(world.x, world.y, '×', {
          fontFamily: 'DNF Forged Blade Medium',
          fontSize: '23px',
          color: '#5d5147',
        }).setOrigin(0.5)
        this.disabledCellContainer.add([cover, label])
      }
    }
  }

  updateActiveBoardCells(health) {
    const targetCount = getActiveBoardCellCount(health, BOARD_CELLS.length)
    const previousCount = this.activeCellKeys.size
    if (targetCount === previousCount) return

    const nextKeys = new Set(BOARD_CELLS.slice(0, targetCount).map(cellKey))

    const reduced = nextKeys.size < previousCount
    this.activeCellKeys = nextKeys
    this.activeCells = BOARD_CELLS.filter((cell) => nextKeys.has(cellKey(cell)))
    this.activeCellCount = nextKeys.size
    const hasFormworkTexture = this.textures.exists('battle-formwork')
    BOARD_CELLS.forEach(([column, row]) => {
      const key = cellKey([column, row])
      const background = this.boardCellBackgrounds.get(key)
      if (!nextKeys.has(key) || background) return
      const world = gridToWorld(row, column, BOARD_METRICS)
      this.boardCellBackgrounds.set(key, this.add.rectangle(
        world.x,
        world.y,
        BOARD_METRICS.cellSize - BOARD_METRICS.gap,
        BOARD_METRICS.cellSize - BOARD_METRICS.gap,
        COLORS.ghost,
        hasFormworkTexture ? 0.08 : 0.34,
      ).setStrokeStyle(2, 0xc9a976, 0.4).setDepth(-1))
    })
    this.drawDisabledFormworkCells()
    this.emitBoardState()
    if (reduced && this.tutorialMode) {
      gameBridge.emit(GAME_EVENTS.TUTORIAL_ACTION, { type: 'tutorial-board-shrunk' })
    }
  }

  createPiece(block, index) {
    const { x, bounds: homeBounds } = this.handSlots[index]
    const y = HAND_SURFACE_Y - (homeBounds.y + homeBounds.height / 2)
    const container = this.add.container(x, y)
    this.handContainer.add(container)
    const piece = { block, container, rotation: 0, placed: false, boardX: null, boardY: null, homeX: x, homeY: y, layoutMode: 'hand', placedOrder: null, dragOrigin: null }
    this.layoutPieceForHand(piece)
    this.pieces.push(piece)
  }

  refreshHandSlotPositions() {
    const anvilFrame = document.querySelector('.battle-center-ui__anvil-frame')
    const canvasBounds = this.game.canvas.getBoundingClientRect()
    if (!anvilFrame || !canvasBounds.width || !canvasBounds.height) return
    const frameBounds = anvilFrame.getBoundingClientRect()
    if (!frameBounds.width || !frameBounds.height) return
    this.handSlots.forEach((slot, index) => {
      const clientX = frameBounds.left + frameBounds.width * (ANVIL_SLOT_X_RATIOS[index] ?? ANVIL_SLOT_X_RATIOS.at(-1))
      const clientY = frameBounds.top + frameBounds.height * ANVIL_SLOT_Y_RATIO
      slot.x = (clientX - canvasBounds.left) * this.scale.width / canvasBounds.width
      slot.y = (clientY - canvasBounds.top) * this.scale.height / canvasBounds.height
    })
    this.pieces.forEach((piece, index) => {
      if (piece.placed || this.selected === piece) return
      const slot = this.handSlots[index]
      if (!slot) return
      const bounds = getBlockVisualBounds(layoutBlockForHand(piece.block, piece.rotation, HAND_METRICS))
      piece.homeX = slot.x
      piece.homeY = slot.y - (bounds.y + bounds.height / 2)
      piece.container.setPosition(piece.homeX, piece.homeY)
    })
  }

  isPointerOverPiece(pointer, piece) {
    const localX = pointer.worldX - piece.container.x
    const localY = pointer.worldY - piece.container.y
    return isPointInsideBlock(piece.layout, localX, localY)
  }

  selectPieceAtPointer(pointer) {
    if (this.selected) return
    const piece = [...this.pieces].reverse().find((candidate) => this.isPointerOverPiece(pointer, candidate))
    if (piece) this.selectPiece(piece, pointer)
  }

  selectPiece(piece, pointer) {
    if (this.selected) return
    this.selected = piece
    piece.dragOrigin = {
      rotation: piece.rotation,
      depth: piece.container.depth,
      scaleX: piece.container.scaleX,
      scaleY: piece.container.scaleY,
    }
    gameBridge.emit(GAME_EVENTS.TUTORIAL_ACTION, { type: 'block-drag-started' })
    if (piece.placed) this.removeOccupancy(piece)
    if (piece.container.parentContainer === this.handContainer) {
      this.handContainer.remove(piece.container)
      this.children.add(piece.container)
    }
    piece.container.setPosition(pointer.worldX, pointer.worldY)
    piece.container.setAlpha(DRAG_ALPHA)
    piece.container.setDepth(20)
    this.previewPieceLayout(piece)
  }

  moveSelected(pointer) {
    if (!this.selected || !pointer.isDown) return
    this.selected.container.setPosition(pointer.worldX, pointer.worldY)
    this.previewPieceLayout(this.selected)
  }

  releaseSelected(forceInvalid = false) {
    if (!this.selected) return
    const piece = this.selected
    piece.container.setAlpha(1)
    piece.container.setDepth(1)
    const placed = !forceInvalid && this.tryPlace(piece)
    if (!placed) this.restorePieceToHand(piece)
    piece.dragOrigin = null
    this.selected = null
  }

  releaseSelectedOutside() {
    this.releaseSelected(true)
  }

  handleWindowPointerUp(event) {
    if (!this.selected) return
    const bounds = this.game.canvas.getBoundingClientRect()
    const outsideCanvas = event.clientX < bounds.left || event.clientX > bounds.right
      || event.clientY < bounds.top || event.clientY > bounds.bottom
    this.releaseSelected(outsideCanvas)
  }

  restorePieceToHand(piece) {
    piece.placed = false
    piece.rotation = piece.dragOrigin?.rotation ?? piece.rotation
    piece.container.setScale(piece.dragOrigin?.scaleX ?? 1, piece.dragOrigin?.scaleY ?? 1)
    piece.container.setPosition(piece.homeX, piece.homeY)
    this.handContainer.add(piece.container)
    this.layoutPieceForHand(piece, COLORS.invalid)
    piece.container.setDepth(piece.dragOrigin?.depth ?? 1)
    this.time.delayedCall(180, () => { if (!piece.placed) this.layoutPieceForHand(piece) })
    this.emitBoardState()
  }

  applyPieceLayout(piece, layout, mode, tint, stroke = STROKES.hand) {
    piece.container.removeAll(true)
    const texture = BLOCK_TEXTURES[piece.block.color] ?? BLOCK_TEXTURES.steel
    layout.cells.forEach(({ x, y, size }) => {
      const cellX = x
      const cellY = y
      if (texture && this.textures.exists(texture.key)) {
        const image = this.add.image(cellX, cellY, texture.key).setDisplaySize(size, size)
        if (mode === 'hand' && tint === COLORS.invalid) image.setTint(tint)
        piece.container.add(image)
        piece.container.add(this.add.rectangle(cellX, cellY, size, size, 0xffffff, 0).setStrokeStyle(stroke.width, stroke.color))
        return
      }
      const cell = this.add.rectangle(cellX, cellY, size, size, tint).setStrokeStyle(stroke.width, stroke.color)
      piece.container.add(cell)
    })
    piece.layoutMode = mode
    piece.layout = layout
  }

  layoutPieceForHand(piece, tint = COLORS.neutral) {
    this.applyPieceLayout(piece, layoutBlockForHand(piece.block, piece.rotation, HAND_METRICS), 'hand', tint)
  }

  layoutPieceForBoard(piece, placed = false) {
    const latestOrder = Math.max(0, ...this.pieces.filter((item) => item.placed).map((item) => item.placedOrder))
    const isLatest = placed && piece.placedOrder === latestOrder
    this.applyPieceLayout(
      piece,
      layoutBlockForBoard(piece.block, piece.rotation, BOARD_METRICS),
      placed ? 'placed' : 'board-preview',
      placed ? COLORS.placed : COLORS.valid,
      placed ? (isLatest ? STROKES.latest : STROKES.placed) : STROKES.preview,
    )
  }

  refreshPlacedHighlights() {
    this.pieces.filter((piece) => piece.placed).forEach((piece) => this.layoutPieceForBoard(piece, true))
  }

  getPlacementCandidate(piece) {
    const boardLayout = layoutBlockForBoard(piece.block, piece.rotation, BOARD_METRICS)
    const anchor = getBlockAnchorOffset(boardLayout)
    const { column, row } = worldToGrid(piece.container.x - anchor.x, piece.container.y - anchor.y, BOARD_METRICS)
    const cells = getPlacedCells(piece.block.cells, piece.rotation, column, row)
    const canAdd = canPlaceAnotherBlock(
      this.pieces.filter((item) => item.placed).length,
      this.getPlacementLimit(),
    )
    const valid = canAdd && canPlaceBlock({ cells, activeCellKeys: this.activeCellKeys, occupiedCellKeys: new Set(this.occupied.keys()) })
    return { column, row, cells, valid }
  }

  previewPieceLayout(piece) {
    const { valid } = this.getPlacementCandidate(piece)
    if (valid && piece.layoutMode !== 'board-preview') this.layoutPieceForBoard(piece)
    if (!valid && piece.layoutMode !== 'hand') this.layoutPieceForHand(piece)
  }

  rotateSelected() {
    if (!this.selected) return
    this.selected.rotation = (this.selected.rotation + 1) % 4
    gameBridge.emit(GAME_EVENTS.TUTORIAL_ACTION, { type: 'block-rotated' })
    const { valid } = this.getPlacementCandidate(this.selected)
    if (valid) this.layoutPieceForBoard(this.selected)
    else this.layoutPieceForHand(this.selected)
  }

  cycleLatestPlacedBlockColor() {
    if (this.selected) return
    const piece = this.pieces
      .filter((candidate) => candidate.placed && ['steel', 'water', 'nature', 'fire'].includes(candidate.block.color))
      .sort((left, right) => right.placedOrder - left.placedOrder)[0]
    if (!piece) return
    const nextBlock = cycleStandardBlockColor(piece.block)
    if (nextBlock === piece.block) return
    piece.block = nextBlock
    this.refreshPlacedHighlights()
    this.emitBoardState()
  }

  tryPlace(piece) {
    const candidate = this.getPlacementCandidate(piece)
    if (!candidate.valid) {
      return false
    }
    piece.placed = true
    piece.placedOrder = ++this.placementOrder
    piece.boardX = candidate.column
    piece.boardY = candidate.row
    candidate.cells.forEach((cell) => this.occupied.set(cellKey(cell), piece.block.id))
    const world = gridToWorld(candidate.row, candidate.column, BOARD_METRICS)
    const anchor = getBlockAnchorOffset(layoutBlockForBoard(piece.block, piece.rotation, BOARD_METRICS))
    piece.container.setPosition(world.x + anchor.x, world.y + anchor.y)
    this.refreshPlacedHighlights()
    this.emitBoardState({ placementCommitted: true })
    gameBridge.emit(GAME_EVENTS.TUTORIAL_ACTION, { type: 'block-placed' })
    return true
  }

  removeOccupancy(piece) {
    for (const [key, id] of this.occupied.entries()) if (id === piece.block.id) this.occupied.delete(key)
    piece.placed = false
    piece.placedOrder = null
    this.refreshPlacedHighlights()
    this.emitBoardState()
  }

  getQuickCombinationPlacementState({ combinationId, clientX, clientY, rotation = 0 }) {
    const canvasBounds = this.game.canvas.getBoundingClientRect()
    if (clientX < canvasBounds.left || clientX > canvasBounds.right
      || clientY < canvasBounds.top || clientY > canvasBounds.bottom) return { insideFormwork: false }

    const unplacedPieces = this.pieces.filter(({ placed }) => !placed)
    const plan = getQuickCombinationPlan(combinationId, unplacedPieces.map(({ block }) => block))
    if (!plan) return { insideFormwork: false }

    const worldX = (clientX - canvasBounds.left) * this.scale.width / canvasBounds.width
    const worldY = (clientY - canvasBounds.top) * this.scale.height / canvasBounds.height
    const pointerCell = worldToGrid(worldX, worldY, BOARD_METRICS)
    if (pointerCell.column < 0 || pointerCell.column >= FORMWORK_GRID_SIZE
      || pointerCell.row < 0 || pointerCell.row >= FORMWORK_GRID_SIZE) {
      return { insideFormwork: false }
    }

    const turns = plan.combination.match_options.allow_recipe_rotation ? rotation % 4 : 0
    const layout = getRotatedQuickLayoutSize(plan.layout, turns)
    const topLeftX = worldX - ((layout.width - 1) * BOARD_METRICS.cellSize) / 2
    const topLeftY = worldY - ((layout.height - 1) * BOARD_METRICS.cellSize) / 2
    const anchor = worldToGrid(topLeftX, topLeftY, BOARD_METRICS)
    const occupiedKeys = new Set(this.occupied.keys())
    const hasCapacity = this.pieces.filter(({ placed }) => placed).length + plan.assignments.length <= this.getPlacementLimit()
    let valid = hasCapacity
    const placements = []

    for (const assignment of plan.assignments) {
      const piece = unplacedPieces.find(({ block }) => block.id === assignment.blockId)
      if (!piece) return { insideFormwork: false }
      const baseRotation = assignment.rotation / 90
      const recipeCells = getPlacedCells(piece.block.cells, baseRotation, assignment.origin.x, assignment.origin.y)
        .map(([x, y]) => rotateQuickCell({ x, y }, plan.layout.width, plan.layout.height, turns))
      const column = anchor.column + Math.min(...recipeCells.map(({ x }) => x))
      const row = anchor.row + Math.min(...recipeCells.map(({ y }) => y))
      const pieceRotation = (baseRotation + turns) % 4
      const cells = getPlacedCells(piece.block.cells, pieceRotation, column, row)
      if (!canPlaceBlock({ cells, activeCellKeys: this.activeCellKeys, occupiedCellKeys: occupiedKeys })) valid = false
      cells.forEach((cell) => occupiedKeys.add(cellKey(cell)))
      placements.push({ piece, rotation: pieceRotation, column, row, cells })
    }

    return { insideFormwork: true, valid, placements }
  }

  renderQuickCombinationGhost({ valid, placements }) {
    this.quickCombinationGhost.removeAll(true)
    const color = valid ? COLORS.valid : 0xd96b63
    placements.forEach(({ piece, cells }) => {
      const texture = BLOCK_TEXTURES[piece.block.color] ?? BLOCK_TEXTURES.steel
      cells.forEach(([column, row]) => {
        const world = gridToWorld(row, column, BOARD_METRICS)
        const image = this.add.image(world.x, world.y, texture.key)
          .setDisplaySize(BOARD_METRICS.cellSize - BOARD_METRICS.gap, BOARD_METRICS.cellSize - BOARD_METRICS.gap)
          .setTint(color)
          .setAlpha(.42)
        const outline = this.add.rectangle(
          world.x,
          world.y,
          BOARD_METRICS.cellSize - BOARD_METRICS.gap,
          BOARD_METRICS.cellSize - BOARD_METRICS.gap,
          color,
          0,
        ).setStrokeStyle(3, color, .9)
        this.quickCombinationGhost.add([image, outline])
      })
    })
    this.quickCombinationGhost.setVisible(true)
  }

  previewQuickCombination(payload) {
    const rotation = this.quickCombinationPreview?.combinationId === payload.combinationId
      ? this.quickCombinationPreview.rotation
      : 0
    this.quickCombinationPreview = { ...payload, rotation }
    const state = this.getQuickCombinationPlacementState(this.quickCombinationPreview)
    if (!state.insideFormwork) {
      this.quickCombinationGhost.removeAll(true)
      this.quickCombinationGhost.setVisible(false)
      return
    }
    this.renderQuickCombinationGhost(state)
  }

  rotateQuickCombinationPreview() {
    if (!this.quickCombinationPreview) return
    this.quickCombinationPreview.rotation = (this.quickCombinationPreview.rotation + 1) % 4
    const state = this.getQuickCombinationPlacementState(this.quickCombinationPreview)
    if (!state.insideFormwork) return
    this.renderQuickCombinationGhost(state)
  }

  clearQuickCombinationPreview() {
    this.quickCombinationPreview = null
    this.quickCombinationGhost?.removeAll(true)
    this.quickCombinationGhost?.setVisible(false)
  }

  placeQuickCombination(payload) {
    const rotation = this.quickCombinationPreview?.combinationId === payload.combinationId
      ? this.quickCombinationPreview.rotation
      : 0
    const state = this.getQuickCombinationPlacementState({ ...payload, rotation })
    this.clearQuickCombinationPreview()
    if (!state.insideFormwork || !state.valid) return

    state.placements.forEach(({ piece, rotation: pieceRotation, column, row, cells }) => {
      piece.rotation = pieceRotation
      piece.placed = true
      piece.placedOrder = ++this.placementOrder
      piece.boardX = column
      piece.boardY = row
      cells.forEach((cell) => this.occupied.set(cellKey(cell), piece.block.id))
      const world = gridToWorld(row, column, BOARD_METRICS)
      const blockAnchor = getBlockAnchorOffset(layoutBlockForBoard(piece.block, piece.rotation, BOARD_METRICS))
      piece.container.setPosition(world.x + blockAnchor.x, world.y + blockAnchor.y)
    })
    this.refreshPlacedHighlights()
    this.emitBoardState({ placementCommitted: true })
    gameBridge.emit(GAME_EVENTS.TUTORIAL_ACTION, { type: 'quick-combination-placed' })
  }

  resetBoard() {
    this.occupied.clear()
    this.placementOrder = 0
    this.pieces.forEach((piece) => {
      piece.placed = false
      piece.placedOrder = null
      piece.container.setPosition(piece.homeX, piece.homeY)
      this.layoutPieceForHand(piece)
    })
    this.emitBoardState()
  }

  emitBoardState({ placementCommitted = false } = {}) {
    const placedBlocks = this.pieces.filter((piece) => piece.placed).map((piece) => ({
      block: piece.block,
      origin: { x: piece.boardX, y: piece.boardY },
      rotation: piece.rotation * 90,
      mirrored: false,
      cells: getPlacedCells(
        piece.block.cells,
        piece.rotation,
        piece.boardX,
        piece.boardY,
      ).map(([x, y]) => ({ x, y })),
    }))
    const effects = resolveBlockEffects(placedBlocks, { currentArmor: this.currentArmor })
    this.drawCombinationGlows(findMatchingCombinations(placedBlocks))
    this.updateFormworkAura(placedBlocks)
    const hasUnknownCombination = effects.combinationDetails.some(
      ({ id }) => !this.knownBlueprintIds.has(id),
    )
    const combatFormula = resolveCombatFormulaPreview(effects, this.combatFormulaContext)
    const effectValues = hasUnknownCombination ? '???' : describeFinalBlockEffects(effects, {
      baseDamage: combatFormula.baseResult,
      independentDamage: combatFormula.independentResult,
    })
    const disclosedEffectValues = hasUnknownCombination ? effectValues : [
      effectValues,
      effects.colorSynergy.hitCountModifier
        ? `타격 횟수 +${effects.colorSynergy.hitCountModifier}`
        : '',
      effects.colorSynergy.retainArmorNextTurn ? '방어도 다음 턴 유지' : '',
      effects.colorSynergy.addArmorToIndependentDamage ? '방어도→효과 피해' : '',
    ].filter(Boolean).join('  ')
    const combinationDetails = effects.combinationDetails.length
      ? effects.combinationDetails.map((detail) => !this.knownBlueprintIds.has(detail.id)
        ? { ...detail, name: '???', color: null, effects: [] }
        : detail)
      : [{ name: '조합 없음', color: null, effects: [] }]
    const combatFormulaLines = this.developerMode
      ? combatFormula.lines
      : []
    gameBridge.emit(GAME_EVENTS.BOARD_CHANGED, {
      placedCount: placedBlocks.length,
      placementLimit: this.getPlacementLimit(),
      occupiedCells: this.occupied.size,
      totalBoardCells: this.activeCellCount,
      placedBlocks,
      combinationIds: placementCommitted ? effects.combinationDetails.map(({ id }) => id) : [],
    })
  }
}
