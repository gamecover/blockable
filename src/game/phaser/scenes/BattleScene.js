import Phaser from 'phaser'
import { BOARD_CELLS, BOARD_CELL_GAP, BOARD_CELL_SIZE, HAND_BLOCK_CELL_GAP, HAND_BLOCK_CELL_SIZE, PLACEMENTS_PER_TURN } from '../../constants/gameConfig.js'
import { GAME_EVENTS, gameBridge } from '../../events/gameEvents.js'
import { canPlaceAnotherBlock, canPlaceBlock, cellKey, getActiveBoardCellCount, getPlacedCells } from '../../systems/boardPlacementSystem.js'
import {
  describeDamageRange,
  resolveBlockEffects,
} from '../../systems/blockEffectSystem.js'
import { getQuickCombinationPlan } from '../../systems/blueprintSystem.js'
import { getBlockAnchorOffset, gridToWorld, isPointInsideBlock, layoutBlockForBoard, layoutBlockForHand, layoutBlocksInCenteredRow, worldToGrid } from '../layout/blockLayout.js'
import { cycleStandardBlockColor } from '../../../objects/blocks/blockData.js'
import curseTexture from '../../../assets/sprites/blocks/block_curse.png'
import fireTexture from '../../../assets/sprites/blocks/block_fire.png'
import legendTexture from '../../../assets/sprites/blocks/block_legend.png'
import natureTexture from '../../../assets/sprites/blocks/block_nature.png'
import specialTexture from '../../../assets/sprites/blocks/block_special.png'
import steelTexture from '../../../assets/sprites/blocks/block_steel.png'
import waterTexture from '../../../assets/sprites/blocks/block_water.png'
import anvilTexture from '../../../screens/battle/assets/pictures/anvil_alpha.png'
import formworkTexture from '../../../screens/battle/assets/pictures/formwork_alpha.png'

const BOARD_METRICS = { originX: 326, originY: 128, cellSize: BOARD_CELL_SIZE, gap: BOARD_CELL_GAP }
const HAND_METRICS = { cellSize: HAND_BLOCK_CELL_SIZE, gap: HAND_BLOCK_CELL_GAP }
const BATTLE_STAGE_WIDTH = 820
const HAND_HORIZONTAL_GAP = HAND_BLOCK_CELL_SIZE * 1.5
const ANVIL_CENTER_Y = 637
const ANVIL_DISPLAY_HEIGHT = 383
const FORMWORK_GRID_SIZE = 5
const FORMWORK_TEXTURE_SIZE = 700
const FORMWORK_TEXTURE_CELL_PITCH = 110
const FORMWORK_DISPLAY_SIZE = FORMWORK_TEXTURE_SIZE * BOARD_CELL_SIZE / FORMWORK_TEXTURE_CELL_PITCH
const BOARD_CENTER = gridToWorld(1, 1, BOARD_METRICS)
const EFFECT_SUMMARY_X = BOARD_CENTER.x + FORMWORK_DISPLAY_SIZE / 2 + 10
const EFFECT_SUMMARY_Y = BOARD_CENTER.y + FORMWORK_DISPLAY_SIZE / 2 - 54
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

export class BattleScene extends Phaser.Scene {
  constructor() { super('battle') }

  init(data) {
    this.hand = data.hand ?? []
    this.developerMode = data.developerMode === true
    this.activeCellCount = getActiveBoardCellCount(data.health ?? 75, BOARD_CELLS.length)
    this.occupied = new Map()
    this.pieces = []
    this.handSlots = layoutBlocksInCenteredRow(this.hand, HAND_METRICS, BATTLE_STAGE_WIDTH, HAND_HORIZONTAL_GAP)
    this.selected = null
    this.placementOrder = 0
    this.unsubReset = null
    this.unsubInput = null
    this.unsubQuickCombination = null
    this.inputEnabled = true
    this.handleWindowKeyDown = (event) => {
      if (!this.inputEnabled) return
      if (event.code === 'KeyR' && this.selected) {
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
    const bonus = resolveBlockEffects(placedBlocks).placementCountChanges
      .reduce((sum, effect) => sum + Math.max(0, effect.value), 0)
    return PLACEMENTS_PER_TURN + bonus
  }

  preload() {
    Object.values(BLOCK_TEXTURES).forEach(({ key, url }) => this.load.image(key, url))
    this.load.image('battle-anvil', anvilTexture)
    this.load.image('battle-formwork', formworkTexture)
  }

  create() {
    this.cameras.main.setBackgroundColor('rgba(0,0,0,0)')
    this.drawBoard()
    this.createEffectSummary()
    this.add.text(24, HAND_SURFACE_Y - 53, '도구 주머니', { fontFamily: 'DNF Forged Blade Medium', fontSize: '17px', color: '#ecd9b7' })
    const controlsText = this.developerMode
      ? '드래그해 배치\n드래그 중 R로 회전\nZ로 최근 일반 블록 색상 변경'
      : '드래그해 배치\n드래그 중 R로 회전'
    this.add.text(24, HAND_SURFACE_Y - 30, controlsText, {
      fontFamily: 'DNF Forged Blade Medium',
      fontSize: '11px',
      lineSpacing: 2,
      color: '#9c8b75',
    })
    this.hand.forEach((block, index) => this.createPiece(block, index))
    window.addEventListener('keydown', this.handleWindowKeyDown)
    this.input.on('pointerdown', this.selectPieceAtPointer, this)
    this.input.on('pointermove', this.moveSelected, this)
    this.input.on('pointerup', this.releaseSelected, this)
    this.unsubReset = gameBridge.on(GAME_EVENTS.RESET_BOARD, () => this.resetBoard())
    this.unsubQuickCombination = gameBridge.on(
      GAME_EVENTS.QUICK_COMBINATION_DROP,
      (payload) => this.placeQuickCombination(payload),
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
      this.unsubReset?.()
      this.unsubInput?.()
      this.unsubQuickCombination?.()
    })
    this.emitBoardState()
  }

  drawBoard() {
    this.activeCells = BOARD_CELLS.slice(0, this.activeCellCount)
    this.activeCellKeys = new Set(this.activeCells.map(cellKey))
    const hasFormworkTexture = this.textures.exists('battle-formwork')
    if (this.textures.exists('battle-anvil')) {
      this.add.image(410, ANVIL_CENTER_Y, 'battle-anvil')
        .setDisplaySize(760, ANVIL_DISPLAY_HEIGHT)
        .setFlipX(true)
        .setDepth(-3)
    }
    if (hasFormworkTexture) {
      this.add.image(BOARD_CENTER.x, BOARD_CENTER.y, 'battle-formwork')
        .setDisplaySize(FORMWORK_DISPLAY_SIZE, FORMWORK_DISPLAY_SIZE)
        .setDepth(-2)
    }

    this.activeCells.forEach(([column, row]) => {
      const world = gridToWorld(row, column, BOARD_METRICS)
      this.add.rectangle(world.x, world.y, BOARD_METRICS.cellSize - BOARD_METRICS.gap, BOARD_METRICS.cellSize - BOARD_METRICS.gap, COLORS.ghost, hasFormworkTexture ? 0.08 : 0.34)
        .setStrokeStyle(2, 0xc9a976, 0.4)
        .setDepth(-1)
    })
    this.drawDisabledFormworkCells()
  }

  createEffectSummary() {
    this.add.rectangle(EFFECT_SUMMARY_X, EFFECT_SUMMARY_Y, 270, 96, 0x0d0a08, 0.98)
      .setOrigin(0, 0.5)
      .setStrokeStyle(2, 0xb47a43, 1)
      .setDepth(28)
    this.formworkEffectText = this.add.text(
      EFFECT_SUMMARY_X + 8,
      EFFECT_SUMMARY_Y - 17,
      '예상 효과 없음',
      {
        fontFamily: 'DNF Forged Blade Medium',
        fontSize: '12px',
        lineSpacing: 4,
        color: '#f1dfc2',
        stroke: '#080604',
        strokeThickness: 2,
        wordWrap: { width: 250 },
      },
    ).setOrigin(0, 0.5).setDepth(29)
    this.formworkCombinationContainer = this.add.container(
      EFFECT_SUMMARY_X + 8,
      EFFECT_SUMMARY_Y + 8,
    ).setDepth(29)
  }

  drawDisabledFormworkCells() {
    for (let formworkRow = 0; formworkRow < FORMWORK_GRID_SIZE; formworkRow += 1) {
      for (let formworkColumn = 0; formworkColumn < FORMWORK_GRID_SIZE; formworkColumn += 1) {
        const column = formworkColumn - 1
        const row = formworkRow - 1
        if (this.activeCellKeys.has(cellKey([column, row]))) continue
        const world = gridToWorld(row, column, BOARD_METRICS)
        this.add.rectangle(
          world.x,
          world.y,
          BOARD_METRICS.cellSize - BOARD_METRICS.gap,
          BOARD_METRICS.cellSize - BOARD_METRICS.gap,
          0x090807,
          0.68,
        ).setStrokeStyle(2, 0x3e332a, 0.9).setDepth(0)
        this.add.text(world.x, world.y, '×', {
          fontFamily: 'DNF Forged Blade Medium',
          fontSize: '23px',
          color: '#5d5147',
        }).setOrigin(0.5).setDepth(0)
      }
    }
  }

  createPiece(block, index) {
    const { x, bounds: homeBounds } = this.handSlots[index]
    const y = HAND_SURFACE_Y - (homeBounds.y + homeBounds.height)
    const container = this.add.container(x, y)
    const piece = { block, container, rotation: 0, placed: false, boardX: null, boardY: null, homeX: x, homeY: y, layoutMode: 'hand', placedOrder: null }
    this.layoutPieceForHand(piece)
    this.pieces.push(piece)
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
    if (piece.placed) this.removeOccupancy(piece)
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

  releaseSelected() {
    if (!this.selected) return
    const piece = this.selected
    piece.container.setAlpha(1)
    piece.container.setDepth(1)
    this.tryPlace(piece)
    this.selected = null
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
      piece.placed = false
      piece.container.setPosition(piece.homeX, piece.homeY)
      this.layoutPieceForHand(piece, COLORS.invalid)
      this.time.delayedCall(180, () => { if (!piece.placed) this.layoutPieceForHand(piece) })
      this.emitBoardState()
      return
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
    this.emitBoardState()
  }

  removeOccupancy(piece) {
    for (const [key, id] of this.occupied.entries()) if (id === piece.block.id) this.occupied.delete(key)
    piece.placed = false
    piece.placedOrder = null
    this.refreshPlacedHighlights()
    this.emitBoardState()
  }

  placeQuickCombination({ combinationId, clientX, clientY }) {
    const canvasBounds = this.game.canvas.getBoundingClientRect()
    if (clientX < canvasBounds.left || clientX > canvasBounds.right
      || clientY < canvasBounds.top || clientY > canvasBounds.bottom) return
    const unplacedPieces = this.pieces.filter(({ placed }) => !placed)
    const plan = getQuickCombinationPlan(
      combinationId,
      unplacedPieces.map(({ block }) => block),
    )
    const placedCount = this.pieces.filter(({ placed }) => placed).length
    if (!plan || placedCount + plan.assignments.length > this.getPlacementLimit()) return

    const worldX = (clientX - canvasBounds.left) * this.scale.width / canvasBounds.width
    const worldY = (clientY - canvasBounds.top) * this.scale.height / canvasBounds.height
    const topLeftX = worldX - ((plan.layout.width - 1) * BOARD_METRICS.cellSize) / 2
    const topLeftY = worldY - ((plan.layout.height - 1) * BOARD_METRICS.cellSize) / 2
    const anchor = worldToGrid(topLeftX, topLeftY, BOARD_METRICS)
    const occupiedKeys = new Set(this.occupied.keys())
    const placements = []

    for (const assignment of plan.assignments) {
      const piece = unplacedPieces.find(({ block }) => block.id === assignment.blockId)
      if (!piece) return
      const rotation = assignment.rotation / 90
      const column = anchor.column + assignment.origin.x
      const row = anchor.row + assignment.origin.y
      const cells = getPlacedCells(piece.block.cells, rotation, column, row)
      if (!canPlaceBlock({
        cells,
        activeCellKeys: this.activeCellKeys,
        occupiedCellKeys: occupiedKeys,
      })) return
      cells.forEach((cell) => occupiedKeys.add(cellKey(cell)))
      placements.push({ piece, rotation, column, row, cells })
    }

    placements.forEach(({ piece, rotation, column, row, cells }) => {
      piece.rotation = rotation
      piece.placed = true
      piece.placedOrder = ++this.placementOrder
      piece.boardX = column
      piece.boardY = row
      cells.forEach((cell) => this.occupied.set(cellKey(cell), piece.block.id))
      const world = gridToWorld(row, column, BOARD_METRICS)
      const blockAnchor = getBlockAnchorOffset(
        layoutBlockForBoard(piece.block, piece.rotation, BOARD_METRICS),
      )
      piece.container.setPosition(world.x + blockAnchor.x, world.y + blockAnchor.y)
    })
    this.refreshPlacedHighlights()
    this.emitBoardState()
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

  emitBoardState() {
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
    const effects = resolveBlockEffects(placedBlocks)
    const effectValues = [
      [
        '공격력',
        effects.baseDamageEffects.reduce((sum, effect) => sum + effect.amount, 0),
        effects.baseDamageEffects,
      ],
      [
        '효과',
        effects.independentDamageEffects.reduce((sum, effect) => sum + effect.amount, 0),
        effects.independentDamageEffects,
      ],
      ['방어', effects.armor, []],
      ['회복', effects.healing, []],
    ]
      .filter(([, value]) => value !== 0)
      .map(([label, value, damageEffects]) => {
        const ranges = [...new Set(damageEffects.map(describeDamageRange))]
        return `${label} ${value}${ranges.length ? ` · 범위 ${ranges.join('/')}` : ''}`
      })
      .join('  ')
    this.formworkEffectText?.setText(effectValues || '예상 효과 없음')
    this.formworkCombinationContainer?.removeAll(true)
    const combinationDetails = effects.combinationDetails.length
      ? effects.combinationDetails
      : [{ name: '조합 없음', color: null, effects: [] }]
    combinationDetails.forEach(({ name, color, effects: appliedEffects }, index) => {
      const nameText = this.add.text(0, index * 18, name, {
        fontFamily: 'DNF Forged Blade Medium',
        fontSize: '12px',
        color: COMBINATION_NAME_COLORS[color] ?? '#f1dfc2',
        stroke: '#080604',
        strokeThickness: 2,
      })
      const effectText = this.add.text(
        nameText.width + 4,
        index * 18,
        appliedEffects.length ? `· ${appliedEffects.join(', ')}` : '',
        {
          fontFamily: 'DNF Forged Blade Medium',
          fontSize: '12px',
          color: '#f1dfc2',
          stroke: '#080604',
          strokeThickness: 2,
        },
      )
      this.formworkCombinationContainer.add([nameText, effectText])
    })
    gameBridge.emit(GAME_EVENTS.BOARD_CHANGED, {
      placedCount: placedBlocks.length,
      placementLimit: this.getPlacementLimit(),
      occupiedCells: this.occupied.size,
      totalBoardCells: this.activeCellCount,
      placedBlocks,
    })
  }
}
