import Phaser from 'phaser'
import { BOARD_CELLS, BOARD_CELL_GAP, BOARD_CELL_SIZE, HAND_BLOCK_CELL_GAP, HAND_BLOCK_CELL_SIZE, PLACEMENTS_PER_TURN } from '../../constants/gameConfig.js'
import { GAME_EVENTS, gameBridge } from '../../events/gameEvents.js'
import { canPlaceBlock, cellKey, getPlacedCells } from '../../systems/boardPlacementSystem.js'
import { gridToWorld, layoutBlockForBoard, layoutBlockForHand, worldToGrid } from '../layout/blockLayout.js'

const BOARD_METRICS = { originX: 374, originY: 84, cellSize: BOARD_CELL_SIZE, gap: BOARD_CELL_GAP }
const HAND_METRICS = { cellSize: HAND_BLOCK_CELL_SIZE, gap: HAND_BLOCK_CELL_GAP }
const COLORS = { neutral: 0xd99a4e, ghost: 0x6f5a42, valid: 0x79b88a, invalid: 0xbd5c4f }

export class BattleScene extends Phaser.Scene {
  constructor() { super('battle') }

  init(data) {
    this.hand = data.hand ?? []
    this.activeCellCount = Math.max(9, Math.min(BOARD_CELLS.length, Math.floor((data.health ?? 75) / 5)))
    this.occupied = new Map()
    this.pieces = []
    this.selected = null
    this.unsubReset = null
  }

  create() {
    this.cameras.main.setBackgroundColor('#17120f')
    this.drawBoard()
    this.add.text(28, 24, '도구 주머니', { fontFamily: 'Georgia', fontSize: '22px', color: '#ecd9b7' })
    this.add.text(28, 53, '드래그해 배치 · 드래그 중 R로 회전', { fontFamily: 'sans-serif', fontSize: '13px', color: '#9c8b75' })
    this.hand.forEach((block, index) => this.createPiece(block, index))
    this.input.keyboard.on('keydown-R', this.rotateSelected, this)
    this.unsubReset = gameBridge.on(GAME_EVENTS.RESET_BOARD, () => this.resetBoard())
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard.off('keydown-R', this.rotateSelected, this)
      this.unsubReset?.()
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
    const piece = { block, container, rotation: 0, placed: false, used: false, boardX: null, boardY: null, homeX: x, homeY: y, layoutMode: 'hand' }
    this.layoutPieceForHand(piece)
    container.setInteractive(new Phaser.Geom.Rectangle(-piece.hitOffset, -piece.hitOffset, piece.hitWidth, piece.hitHeight), Phaser.Geom.Rectangle.Contains)
    container.input.cursor = 'pointer'
    this.input.setDraggable(container)
    container.on('dragstart', () => {
      this.selected = piece
      if (piece.placed) this.removeOccupancy(piece)
      container.setDepth(20)
    })
    container.on('drag', (_pointer, dragX, dragY) => {
      container.setPosition(dragX, dragY)
      this.previewPieceLayout(piece)
    })
    container.on('dragend', () => {
      container.setDepth(1)
      this.tryPlace(piece)
      this.selected = null
    })
    this.pieces.push(piece)
  }

  applyPieceLayout(piece, layout, mode, tint) {
    piece.container.removeAll(true)
    layout.cells.forEach(({ x, y, size }) => {
      piece.container.add(this.add.rectangle(x, y, size, size, tint).setStrokeStyle(2, 0xf4d8a6))
    })
    piece.container.add(this.add.text(0, -layout.cellSize / 2 - 12, piece.block.shape, { fontFamily: 'Georgia', fontSize: '13px', color: '#fff3d6' }).setOrigin(0.5))
    piece.layoutMode = mode
    piece.hitWidth = layout.width
    piece.hitHeight = layout.height
    piece.hitOffset = layout.cellSize / 2
    piece.container.setSize(layout.width, layout.height)
    if (piece.container.input) piece.container.input.hitArea.setTo(-piece.hitOffset, -piece.hitOffset, layout.width, layout.height)
  }

  layoutPieceForHand(piece, tint = COLORS.neutral) {
    this.applyPieceLayout(piece, layoutBlockForHand(piece.block, piece.rotation, HAND_METRICS), 'hand', tint)
  }

  layoutPieceForBoard(piece, tint = COLORS.valid) {
    this.applyPieceLayout(piece, layoutBlockForBoard(piece.block, piece.rotation, BOARD_METRICS), 'board', tint)
  }

  getPlacementCandidate(piece) {
    const { column, row } = worldToGrid(piece.container.x, piece.container.y, BOARD_METRICS)
    const cells = getPlacedCells(piece.block.cells, piece.rotation, column, row)
    const canAdd = piece.used || this.pieces.filter((item) => item.placed).length < PLACEMENTS_PER_TURN
    const valid = canAdd && canPlaceBlock({ cells, activeCellKeys: this.activeCellKeys, occupiedCellKeys: new Set(this.occupied.keys()) })
    return { column, row, cells, valid }
  }

  previewPieceLayout(piece) {
    const { valid } = this.getPlacementCandidate(piece)
    if (valid && piece.layoutMode !== 'board') this.layoutPieceForBoard(piece)
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
    piece.used = true
    piece.boardX = candidate.column
    piece.boardY = candidate.row
    candidate.cells.forEach((cell) => this.occupied.set(cellKey(cell), piece.block.id))
    const world = gridToWorld(candidate.row, candidate.column, BOARD_METRICS)
    piece.container.setPosition(world.x, world.y)
    this.layoutPieceForBoard(piece)
    this.emitBoardState()
  }

  removeOccupancy(piece) {
    for (const [key, id] of this.occupied.entries()) if (id === piece.block.id) this.occupied.delete(key)
    piece.placed = false
    this.emitBoardState()
  }

  resetBoard() {
    this.occupied.clear()
    this.pieces.forEach((piece) => {
      piece.placed = false
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
