import Phaser from 'phaser'
import { BOARD_CELLS, BOARD_CELL_GAP, BOARD_CELL_SIZE, HAND_BLOCK_CELL_GAP, HAND_BLOCK_CELL_SIZE, PLACEMENTS_PER_TURN } from '../../constants/gameConfig.js'
import { GAME_EVENTS, gameBridge } from '../../events/gameEvents.js'
import { canPlaceAnotherBlock, canPlaceBlock, cellKey, getActiveBoardCellCount, getPlacedCells } from '../../systems/boardPlacementSystem.js'
import { resolveBlockEffects } from '../../systems/blockEffectSystem.js'
import { getBlockAnchorOffset, gridToWorld, isPointInsideBlock, layoutBlockForBoard, layoutBlockForHand, layoutBlocksInCenteredRow, worldToGrid } from '../layout/blockLayout.js'
import fireTexture from '../../../assets/sprites/blocks/block_fire.png'
import natureTexture from '../../../assets/sprites/blocks/block_nature.png'
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
  fire: { key: 'block-fire', url: fireTexture },
  nature: { key: 'block-nature', url: natureTexture },
  steel: { key: 'block-steel', url: steelTexture },
  water: { key: 'block-water', url: waterTexture },
}

export class BattleScene extends Phaser.Scene {
  constructor() { super('battle') }

  init(data) {
    this.hand = data.hand ?? []
    this.activeCellCount = getActiveBoardCellCount(data.health ?? 75, BOARD_CELLS.length)
    this.occupied = new Map()
    this.pieces = []
    this.handSlots = layoutBlocksInCenteredRow(this.hand, HAND_METRICS, BATTLE_STAGE_WIDTH, HAND_HORIZONTAL_GAP)
    this.selected = null
    this.placementOrder = 0
    this.unsubReset = null
    this.unsubInput = null
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
    this.add.text(24, HAND_SURFACE_Y - 30, '드래그해 배치\n드래그 중 R로 회전', {
      fontFamily: 'DNF Forged Blade Medium',
      fontSize: '11px',
      lineSpacing: 2,
      color: '#9c8b75',
    })
    this.hand.forEach((block, index) => this.createPiece(block, index))
    this.input.keyboard.on('keydown-R', this.rotateSelected, this)
    this.input.on('pointerdown', this.selectPieceAtPointer, this)
    this.input.on('pointermove', this.moveSelected, this)
    this.input.on('pointerup', this.releaseSelected, this)
    this.unsubReset = gameBridge.on(GAME_EVENTS.RESET_BOARD, () => this.resetBoard())
    this.unsubInput = gameBridge.on(GAME_EVENTS.SET_INPUT_ENABLED, (enabled) => {
      this.input.enabled = enabled
      if (this.input.keyboard) this.input.keyboard.enabled = enabled
    })
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard.off('keydown-R', this.rotateSelected, this)
      this.input.off('pointerdown', this.selectPieceAtPointer, this)
      this.input.off('pointermove', this.moveSelected, this)
      this.input.off('pointerup', this.releaseSelected, this)
      this.unsubReset?.()
      this.unsubInput?.()
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
    this.add.rectangle(EFFECT_SUMMARY_X, EFFECT_SUMMARY_Y, 240, 68, 0x17120f, 0.86)
      .setOrigin(0, 0.5)
      .setStrokeStyle(1, 0x725438, 0.8)
      .setDepth(8)
    this.formworkEffectText = this.add.text(
      EFFECT_SUMMARY_X + 8,
      EFFECT_SUMMARY_Y,
      '피해 0  방어 0  회복 0\n조합 없음',
      {
        fontFamily: 'DNF Forged Blade Medium',
        fontSize: '10px',
        lineSpacing: 4,
        color: '#d8c4a5',
        wordWrap: { width: 222 },
      },
    ).setOrigin(0, 0.5).setDepth(9)
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
    const canAdd = canPlaceAnotherBlock(this.pieces.filter((item) => item.placed).length, PLACEMENTS_PER_TURN)
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
    const combinationText = effects.combinationDetails.length
      ? effects.combinationDetails
        .map(({ name, effects: appliedEffects }) =>
          `${name} · ${appliedEffects.length ? appliedEffects.join(', ') : '추가 효과 없음'}`)
        .join('\n')
      : '조합 없음'
    this.formworkEffectText?.setText(
      `피해 ${effects.damage}  방어 ${effects.armor}  회복 ${effects.healing}\n${combinationText}`,
    )
    gameBridge.emit(GAME_EVENTS.BOARD_CHANGED, {
      placedCount: placedBlocks.length,
      occupiedCells: this.occupied.size,
      totalBoardCells: this.activeCellCount,
      placedBlocks,
    })
  }
}
