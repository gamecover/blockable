import Phaser from 'phaser'
import { BOARD_CELLS, PLACEMENTS_PER_TURN } from '../../constants/gameConfig.js'
import { GAME_EVENTS, gameBridge } from '../../events/gameEvents.js'

const CELL = 54
const BOARD_X = 374
const BOARD_Y = 84
const COLORS = { neutral: 0xd99a4e, ghost: 0x6f5a42, valid: 0x79b88a, invalid: 0xbd5c4f }

const rotateCells = (cells, turns) => {
  let rotated = cells.map(([x, y]) => [x, y])
  for (let turn = 0; turn < turns; turn += 1) rotated = rotated.map(([x, y]) => [-y, x])
  const minX = Math.min(...rotated.map(([x]) => x))
  const minY = Math.min(...rotated.map(([, y]) => y))
  return rotated.map(([x, y]) => [x - minX, y - minY])
}

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
    this.activeCellKeys = new Set(this.activeCells.map(([x, y]) => `${x},${y}`))
    this.activeCells.forEach(([x, y]) => {
      this.add.rectangle(BOARD_X + x * CELL, BOARD_Y + y * CELL, CELL - 5, CELL - 5, COLORS.ghost, 0.34)
        .setStrokeStyle(2, 0xc9a976, 0.55)
    })
  }

  createPiece(block, index) {
    const x = 74 + (index % 3) * 112
    const y = 252 + Math.floor(index / 3) * 112
    const container = this.add.container(x, y)
    const piece = { block, container, rotation: 0, placed: false, used: false, boardX: null, boardY: null, homeX: x, homeY: y }
    this.renderPiece(piece)
    container.setSize(100, 90).setInteractive({ draggable: true, useHandCursor: true })
    this.input.setDraggable(container)
    container.on('dragstart', () => {
      this.selected = piece
      if (piece.placed) this.removeOccupancy(piece)
      container.setDepth(20)
    })
    container.on('drag', (_pointer, dragX, dragY) => { container.setPosition(dragX, dragY) })
    container.on('dragend', () => {
      container.setDepth(1)
      this.tryPlace(piece)
      this.selected = null
    })
    this.pieces.push(piece)
  }

  renderPiece(piece, tint = COLORS.neutral) {
    piece.container.removeAll(true)
    const cells = rotateCells(piece.block.cells, piece.rotation)
    cells.forEach(([x, y]) => {
      piece.container.add(this.add.rectangle(x * 25, y * 25, 23, 23, tint).setStrokeStyle(2, 0xf4d8a6))
    })
    piece.container.add(this.add.text(0, -23, piece.block.shape, { fontFamily: 'Georgia', fontSize: '13px', color: '#fff3d6' }).setOrigin(0.5))
  }

  rotateSelected() {
    if (!this.selected) return
    this.selected.rotation = (this.selected.rotation + 1) % 4
    this.renderPiece(this.selected)
  }

  tryPlace(piece) {
    const boardX = Math.round((piece.container.x - BOARD_X) / CELL)
    const boardY = Math.round((piece.container.y - BOARD_Y) / CELL)
    const cells = rotateCells(piece.block.cells, piece.rotation).map(([x, y]) => [boardX + x, boardY + y])
    const canAdd = piece.used || this.pieces.filter((item) => item.placed).length < PLACEMENTS_PER_TURN
    const valid = canAdd && cells.every(([x, y]) => this.activeCellKeys.has(`${x},${y}`) && !this.occupied.has(`${x},${y}`))
    if (!valid) {
      piece.placed = false
      piece.container.setPosition(piece.homeX, piece.homeY)
      this.renderPiece(piece, COLORS.invalid)
      this.time.delayedCall(180, () => this.renderPiece(piece))
      this.emitBoardState()
      return
    }
    piece.placed = true
    piece.used = true
    piece.boardX = boardX
    piece.boardY = boardY
    piece.container.setPosition(BOARD_X + boardX * CELL, BOARD_Y + boardY * CELL)
    cells.forEach(([x, y]) => this.occupied.set(`${x},${y}`, piece.block.id))
    this.renderPiece(piece, COLORS.valid)
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
      this.renderPiece(piece)
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
