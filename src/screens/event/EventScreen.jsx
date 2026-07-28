import { useState } from 'react'
import { ScreenFrame } from '../../components/ui/ScreenFrame.jsx'
import { rollGoldChest } from '../../game/systems/eventSystem.js'
import { BlockPreview } from '../../components/ui/BlockPreview.jsx'
import {
  changeBlockShape,
  infuseBlockColor,
  isModifiableStandardBlock,
  STANDARD_BLOCK_COLORS,
  STANDARD_BLOCK_SHAPES,
} from '../../game/systems/blockModificationSystem.js'

const colorLabels = { nature: '자연', water: '물', fire: '불', steel: '강철' }
const shapeLabels = { '001': 'I형', '002': 'L형', '003': 'O형' }

export function EventScreen({ event, gold, health, maxHealth, deck, onResolve }) {
  const [chestResult, setChestResult] = useState(null)
  const [restAction, setRestAction] = useState(null)
  const [restBlockId, setRestBlockId] = useState(null)
  const modifiableBlocks = deck.filter(isModifiableStandardBlock)
  const restBlock = modifiableBlocks.find(({ id }) => id === restBlockId)

  if (event === 'rest') return (
    <ScreenFrame title="용광로의 쉼터" subtitle="REST">
      <div className="event-card rest"><div className="event-illustration">♥</div><article><p className="eyebrow">휴식 지점</p><h3>열기가 잦아든 작업장이 길가에 남아 있다.</h3><p>몸을 회복하거나, 불씨를 이용해 일반 블록 하나를 다시 벼릴 수 있습니다. 한 가지 작업만 선택할 수 있습니다.</p>
        {!restAction && <div className="event-options rest-options">
          <button className="primary-button" onClick={() => setRestAction('color')}>속성 주입</button>
          <button className="primary-button" onClick={() => onResolve({ heal: 20 })}>체력 +20</button>
          <button className="primary-button" onClick={() => setRestAction('shape')}>모양 변환</button>
        </div>}
        {restAction && !restBlock && <>
          <div className="choice-preview">{restAction === 'color' ? '속성을 변경할 일반 블록을 선택하세요.' : '모양을 변경할 일반 블록을 선택하세요.'}</div>
          <div className="deck-strip" aria-label="변경 가능한 일반 블록">
            {modifiableBlocks.map((block) => <button key={block.id} onClick={() => setRestBlockId(block.id)} aria-label={`${block.name} 선택`}><BlockPreview block={block} compact /></button>)}
          </div>
          <button className="text-button" onClick={() => setRestAction(null)}>이전 선택으로</button>
        </>}
        {restAction === 'color' && restBlock && <>
          <div className="choice-preview rest-block-preview"><BlockPreview block={restBlock} compact /><span>주입할 속성을 선택하세요.</span></div>
          <div className="event-options rest-image-options">
            {STANDARD_BLOCK_COLORS.map((color) => {
              const previewBlock = infuseBlockColor(restBlock, color)
              return <button className="secondary-button" key={color} disabled={restBlock.color === color} onClick={() => onResolve({ replaceBlock: previewBlock })} aria-label={`${colorLabels[color]} 속성으로 변경`} title={colorLabels[color]}><BlockPreview block={previewBlock} compact /></button>
            })}
          </div>
          <button className="text-button" onClick={() => setRestBlockId(null)}>다른 블록 선택</button>
        </>}
        {restAction === 'shape' && restBlock && <>
          <div className="choice-preview rest-block-preview"><BlockPreview block={restBlock} compact /><span>바꿀 모양을 선택하세요.</span></div>
          <div className="event-options rest-image-options">
            {STANDARD_BLOCK_SHAPES.map((shapeId) => {
              const previewBlock = changeBlockShape(restBlock, shapeId)
              return <button className="secondary-button" key={shapeId} disabled={restBlock.definitionId.endsWith(shapeId)} onClick={() => onResolve({ replaceBlock: previewBlock })} aria-label={`${shapeLabels[shapeId]} 모양으로 변경`} title={shapeLabels[shapeId]}><BlockPreview block={previewBlock} compact /></button>
            })}
          </div>
          <button className="text-button" onClick={() => setRestBlockId(null)}>다른 블록 선택</button>
        </>}
      </article></div>
    </ScreenFrame>
  )

  if (event === 'spring') return (
    <ScreenFrame title="생명의 샘" subtitle="RARE ENCOUNTER">
      <div className="event-card spring"><div className="event-illustration">♨</div><article><p className="eyebrow">희귀 이벤트</p><h3>돌 틈에서 푸른 불꽃이 솟는다.</h3><p>불꽃에 손을 담그자 오래된 상처가 아물고, 몸 안에 새로운 힘이 차오릅니다.</p><div className="choice-preview">최대 체력 +25 · 체력 완전 회복</div><button className="primary-button" onClick={() => onResolve({ maxHealth: 25 })}>불꽃을 받아들인다</button></article></div>
    </ScreenFrame>
  )

  if (event === 'chest' && chestResult) return (
    <ScreenFrame title="보물 상자 결과" subtitle="ENCOUNTER RESULT">
      <div className="event-card chest-result"><div className="event-illustration">◆</div><article><p className="eyebrow">획득 결과</p><h3>{chestResult.doubled ? '상자 깊은 곳에서 황금빛이 폭발했다!' : '상자 안에 골드가 가득하다.'}</h3><div className="chest-gold-result">◆ {chestResult.gold} 골드</div><p>획득한 골드는 이번 원정에 즉시 추가됩니다.</p><button className="primary-button" onClick={() => onResolve({ gold: chestResult.gold })}>결과 확인</button></article></div>
    </ScreenFrame>
  )

  if (event === 'chest') return (
    <ScreenFrame title="봉인된 보물 상자" subtitle="ENCOUNTER">
      <div className="event-card chest"><div className="event-illustration">▣</div><article><p className="eyebrow">수상한 발견</p><h3>쇠사슬이 끊어진 상자가 놓여 있다.</h3><p>뚜껑 틈으로 금빛이 새어 나옵니다. 함정일 수도 있지만, 원정에는 골드가 필요합니다.</p><div className="event-options"><button className="primary-button" onClick={() => setChestResult(rollGoldChest())}>상자를 연다</button><button className="secondary-button" onClick={() => onResolve({})}>지나친다</button></div></article></div>
    </ScreenFrame>
  )

  const cost = 50
  return (
    <ScreenFrame title="떠돌이 대장간" subtitle="ENCOUNTER" actions={<div className="resource-bar event-resource-bar"><span>♥ {health}/{maxHealth}</span><span>◆ {gold}</span></div>}>
      <div className="event-card shop"><div className="event-illustration">⚒</div><article><p className="eyebrow">상점</p><h3>불씨를 빌려 도구를 정비할 수 있다.</h3><p>가장 거슬리는 블록 하나를 녹여 주머니를 가볍게 만드세요. 블록 삭제 비용은 ◆ {cost}입니다.</p><div className="deck-strip" aria-label={`보유 블록 ${deck.length}개`}>{deck.map((block) => <button aria-label={`${block.name} 삭제 · ${cost} 골드`} disabled={gold < cost || deck.length <= 5} key={block.id} onClick={() => onResolve({ remove: block.id, gold: -cost })}><BlockPreview block={block} compact /></button>)}</div><button className="text-button" onClick={() => onResolve({})}>아무것도 하지 않고 떠난다</button></article></div>
    </ScreenFrame>
  )
}
