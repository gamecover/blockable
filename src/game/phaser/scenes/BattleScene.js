import Phaser from 'phaser'
import { BOARD_CELLS, BOARD_CELL_GAP, BOARD_CELL_SIZE, HAND_BLOCK_CELL_GAP, HAND_BLOCK_CELL_SIZE, PLACEMENTS_PER_TURN } from '../../constants/gameConfig.js'
import { GAME_EVENTS, gameBridge } from '../../events/gameEvents.js'
import { canPlaceAnotherBlock, canPlaceBlock, cellKey, getActiveBoardCellCount, getPlacedCells } from '../../systems/boardPlacementSystem.js'
import { getBlockAnchorOffset, gridToWorld, isPointInsideBlock, layoutBlockForBoard, layoutBlockForHand, worldToGrid } from '../layout/blockLayout.js'
import fireTexture from '../../../assets/sprites/blocks/block_fire.png'
import natureTexture from '../../../assets/sprites/blocks/block_nature.png'
import steelTexture from '../../../assets/sprites/blocks/block_steel.png'
import waterTexture from '../../../assets/sprites/blocks/block_water.png'

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
    this.selected = null
    this.placementOrder = 0
    this.unsubReset = null
    this.unsubInput = null
  }

  preload() {
    Object.values(BLOCK_TEXTURES).forEach(({ key, url }) => this.load.image(key, url))
  }

  create() {
    this.cameras.main.setBackgroundColor('#17120f')
    this.drawBoard()
    this.add.text(28, 24, '도구 주머니', { fontFamily: 'Georgia', fontSize: '22px', color: '#ecd9b7' })
    this.add.text(28, 53, '드래그해 배치 · 드래그 중 R로 회전', { fontFamily: 'sans-serif', fontSize: '13px', color: '#9c8b75' })
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
    gameBridge.emit(GAME_EVENTS.BOARD_CHANGED, {
      placedCount: this.pieces.filter((piece) => piece.placed).length,
      occupiedCells: this.occupied.size,
      totalBoardCells: this.activeCellCount,
    })
  }
}
