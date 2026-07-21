import Phaser from 'phaser'
import { BOARD_CELLS, BOARD_CELL_GAP, BOARD_CELL_SIZE, HAND_BLOCK_CELL_GAP, HAND_BLOCK_CELL_SIZE, PLACEMENTS_PER_TURN } from '../../constants/gameConfig.js'
import { GAME_EVENTS, gameBridge } from '../../events/gameEvents.js'
import { canPlaceAnotherBlock, canPlaceBlock, cellKey, getActiveBoardCellCount, getPlacedCells } from '../../systems/boardPlacementSystem.js'
import { getBlockHitArea, getBlockVisualCenter, gridToWorld, layoutBlockForBoard, layoutBlockForHand, worldToGrid } from '../layout/blockLayout.js'

const BOARD_METRICS = { originX: 374, originY: 84, cellSize: BOARD_CELL_SIZE, gap: BOARD_CELL_GAP }
const HAND_METRICS = { cellSize: HAND_BLOCK_CELL_SIZE, gap: HAND_BLOCK_CELL_GAP }
const COLORS = { neutral: 0xb9b5ad, ghost: 0x6f5a42, valid: 0x91c99c, placed: 0xb94a42, invalid: 0x8c8177 }
const STROKES = {
  hand: { width: 2, color: 0xe7e0d3 },
  preview: { width: 3, color: 0xf3eee5 },
  placed: { width: 3, color: 0x5c1815 },
  latest: { width: 6, color: 0xffffff },
}
const DRAG_ALPHA = 0.58

export class BattleScene extends Phaser.Scene {
  constructor() { super('battle') }

  init(data) {
    this.hand = data.hand ?? []
    this.activeCellCount = getActiveBoardCellCount(data.health ?? 75, BOARD_CELLS.length)
    this.occupied = new Map()
    this.pieces = []
    this.selected = null
    this.placementOrder = 0
    this.unsubReset = null
    this.unsubInput = null
  }

  create() {
    this.cameras.main.setBackgroundColor('#17120f')
    this.drawBoard()
    this.add.text(28, 24, '도구 주머니', { fontFamily: 'Georgia', fontSize: '22px', color: '#ecd9b7' })
    this.add.text(28, 53, '드래그해 배치 · 드래그 중 R로 회전', { fontFamily: 'sans-serif', fontSize: '13px', color: '#9c8b75' })
    this.hand.forEach((block, index) => this.createPiece(block, index))
    this.input.keyboard.on('keydown-R', this.rotateSelected, this)
    this.unsubReset = gameBridge.on(GAME_EVENTS.RESET_BOARD, () => this.resetBoard())
    this.unsubInput = gameBridge.on(GAME_EVENTS.SET_INPUT_ENABLED, (enabled) => {
      this.input.enabled = enabled
      if (this.input.keyboard) this.input.keyboard.enabled = enabled
    })
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard.off('keydown-R', this.rotateSelected, this)
      this.unsubReset?.()
      this.unsubInput?.()
    })
    this.emitBoardState()
  }

  drawBoard() {
    this.activeCells = BOARD_CELLS.slice(0, this.activeCellCount)
    this.activeCellKeys = new Set(this.activeCells.map(cellKey))
    this.activeCells.forEach(([column, row]) => {
      const world = gridToWorld(row, column, BOARD_METRICS)
      this.add.rectangle(world.x, world.y, BOARD_METRICS.cellSize - BOARD_METRICS.gap, BOARD_METRICS.cellSize - BOARD_METRICS.gap, COLORS.ghost, 0.34)
        .setStrokeStyle(2, 0xc9a976, 0.55)
    })
  }

  createPiece(block, index) {
    const x = 74 + (index % 3) * 112
    const y = 252 + Math.floor(index / 3) * 112
    const container = this.add.container(x, y)
    const piece = { block, container, rotation: 0, placed: false, boardX: null, boardY: null, homeX: x, homeY: y, layoutMode: 'hand', placedOrder: null }
    this.layoutPieceForHand(piece)
    this.updatePieceHitArea(piece)
    container.input.cursor = 'pointer'
    this.input.setDraggable(container)
    container.on('dragstart', (pointer) => {
      this.selected = piece
      if (piece.placed) this.removeOccupancy(piece)
      container.setPosition(pointer.worldX, pointer.worldY)
      this.previewPieceLayout(piece)
      container.setAlpha(DRAG_ALPHA)
      container.setDepth(20)
    })
    container.on('drag', (pointer) => {
      container.setPosition(pointer.worldX, pointer.worldY)
      this.previewPieceLayout(piece)
    })
    container.on('dragend', () => {
      container.setAlpha(1)
      container.setDepth(1)
      this.tryPlace(piece)
      this.selected = null
    })
    this.pieces.push(piece)
  }

  applyPieceLayout(piece, layout, mode, tint, stroke = STROKES.hand) {
    piece.container.removeAll(true)
    const center = getBlockVisualCenter(layout)
    layout.cells.forEach(({ x, y, size }) => {
      piece.container.add(this.add.rectangle(x - center.x, y - center.y, size, size, tint)
        .setStrokeStyle(stroke.width, stroke.color))
    })
    piece.layoutMode = mode
    piece.layout = layout
    if (piece.container.input) this.updatePieceHitArea(piece)
  }

  updatePieceHitArea(piece) {
    const minimumCellSpan = piece.layoutMode === 'hand' ? 2 : 1
    const bounds = getBlockHitArea(piece.layout, minimumCellSpan)
    piece.container.setSize(bounds.width, bounds.height)
    const hitArea = new Phaser.Geom.Rectangle(
      bounds.x + piece.container.displayOriginX,
      bounds.y + piece.container.displayOriginY,
      bounds.width,
      bounds.height,
    )
    if (piece.container.input) {
      piece.container.input.hitArea = hitArea
      piece.container.input.hitAreaCallback = Phaser.Geom.Rectangle.Contains
      piece.container.input.customHitArea = true
      return
    }
    piece.container.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains)
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
    const center = getBlockVisualCenter(boardLayout)
    const { column, row } = worldToGrid(piece.container.x - center.x, piece.container.y - center.y, BOARD_METRICS)
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
    const center = getBlockVisualCenter(layoutBlockForBoard(piece.block, piece.rotation, BOARD_METRICS))
    piece.container.setPosition(world.x + center.x, world.y + center.y)
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
    gameBridge.emit(GAME_EVENTS.BOARD_CHANGED, {
      placedCount: this.pieces.filter((piece) => piece.placed).length,
      occupiedCells: this.occupied.size,
      totalBoardCells: this.activeCellCount,
    })
  }
}
