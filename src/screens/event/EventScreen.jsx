import { useState } from 'react'
import { ScreenFrame } from '../../components/ui/ScreenFrame.jsx'
import { GoldAmount } from '../../components/ui/GoldAmount.jsx'
import {
  createShopOffers,
  getShopCleanupCost,
  getShopPurchaseCost,
  MAX_SHOP_TRANSACTIONS,
  rollGoldChest,
} from '../../game/systems/eventSystem.js'
import { BlockPreview } from '../../components/ui/BlockPreview.jsx'
import {
  changeBlockShape,
  infuseBlockColor,
  isModifiableStandardBlock,
  STANDARD_BLOCK_COLORS,
  STANDARD_BLOCK_SHAPES,
} from '../../game/systems/blockModificationSystem.js'
import oldMoleImage from './assets/pictures/old_mole.png'
import randomChestImage from './assets/pictures/random_chest.png'
import relexHpImage from './assets/pictures/relex_hp.png'
import shopMerchantImage from './assets/pictures/shop_merchant.png'
import { EventLayout } from './components/EventLayout.jsx'

const colorLabels = { nature: '자연', water: '물', fire: '불', steel: '강철' }
const shapeLabels = { '001': 'I형', '002': 'L형', '003': 'O형' }
const eventIllustrations = Object.freeze({
  rest: oldMoleImage,
  chest: randomChestImage,
  spring: relexHpImage,
  shop: shopMerchantImage,
})

function HealthChangePreview({ health, maxHealth, nextHealth, nextMaxHealth, effects }) {
  return (
    <div className="event-health-preview" aria-label={`체력 변화 예상: ${health} / ${maxHealth}에서 ${nextHealth} / ${nextMaxHealth}`}>
      <div className="event-health-preview__effects">{effects.map((effect) => <span key={effect}>{effect}</span>)}</div>
      <strong>HP</strong>
      <div className="event-health-preview__values">
        <span>{health} / {maxHealth}</span>
        <i aria-hidden="true">→</i>
        <b>{nextHealth} / {nextMaxHealth}</b>
      </div>
    </div>
  )
}

export function EventScreen({ event, gold, health, maxHealth, deck, dungeonId, onResolve, onShopTransaction, onDefer }) {
  const [chestResult, setChestResult] = useState(null)
  const [restAction, setRestAction] = useState(null)
  const [restBlockId, setRestBlockId] = useState(null)
  const [shopView, setShopView] = useState('main')
  const [shopTransactionCount, setShopTransactionCount] = useState(0)
  const [shopPurchaseCount, setShopPurchaseCount] = useState(0)
  const [shopCleanupCount, setShopCleanupCount] = useState(0)
  const [shopCurrentPurchasePrice, setShopCurrentPurchasePrice] = useState(null)
  const [shopCurrentCleanupPrice, setShopCurrentCleanupPrice] = useState(null)
  const [shopOffers, setShopOffers] = useState([])
  const modifiableBlocks = deck.filter(isModifiableStandardBlock)
  const restBlock = modifiableBlocks.find(({ id }) => id === restBlockId)
  const restPreviewHealth = Math.min(health + 20, maxHealth)
  const springPreviewHealth = health + 25
  const springPreviewMaxHealth = maxHealth + 25

  if (event === 'rest') return (
    <ScreenFrame title="용광로의 쉼터" subtitle="REST" dungeonId={dungeonId}>
      <EventLayout illustration={eventIllustrations[event]} fallback="♥" title="용광로의 쉼터"><p className="eyebrow">휴식 지점</p><h3>열기가 잦아든 작업장이 길가에 남아 있다.</h3><p>몸을 회복하거나, 불씨를 이용해 일반 블록 하나를 다시 벼릴 수 있습니다. 한 가지 작업만 선택할 수 있습니다.</p>
        {!restAction && <div className="event-options rest-options">
          <button className="primary-button" onClick={() => setRestAction('color')}>속성 주입</button>
          <button className="primary-button" onClick={() => setRestAction('heal')}>체력 +20</button>
          <button className="primary-button" onClick={() => setRestAction('shape')}>모양 변환</button>
          <button className="secondary-button" onClick={onDefer}>지금은 사용하지 않는다</button>
        </div>}
        {restAction === 'heal' && <>
          <HealthChangePreview health={health} maxHealth={maxHealth} nextHealth={restPreviewHealth} nextMaxHealth={maxHealth} effects={['체력 회복 +20']} />
          <div className="event-options rest-options">
            <button className="primary-button" onClick={() => onResolve({ heal: 20 })}>마신다</button>
            <button className="secondary-button" onClick={() => setRestAction(null)}>이전으로 돌아간다</button>
          </div>
        </>}
        {(restAction === 'color' || restAction === 'shape') && !restBlock && <>
          <div className="choice-preview">{restAction === 'color' ? '속성을 변경할 일반 블록을 선택하세요.' : '모양을 변경할 일반 블록을 선택하세요.'}</div>
          <div className="deck-strip" aria-label="변경 가능한 일반 블록">
            {modifiableBlocks.map((block) => <button key={block.id} onClick={() => setRestBlockId(block.id)} aria-label={`${block.name} 선택`}><BlockPreview block={block} compact /></button>)}
          </div>
          <button className="text-button" onClick={() => setRestAction(null)}>이전 선택으로</button>
          <button className="text-button" onClick={onDefer}>나중에 다시 온다</button>
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
          <button className="text-button" onClick={onDefer}>나중에 다시 온다</button>
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
          <button className="text-button" onClick={onDefer}>나중에 다시 온다</button>
        </>}
      </EventLayout>
    </ScreenFrame>
  )

  if (event === 'spring') return (
    <ScreenFrame title="생명의 샘" subtitle="RARE ENCOUNTER" dungeonId={dungeonId}>
      <EventLayout illustration={eventIllustrations[event]} fallback="♨" title="생명의 샘"><p className="eyebrow">희귀 이벤트</p><h3>돌 틈에서 푸른 불꽃이 솟는다.</h3><p>불꽃에 손을 담그자 오래된 상처가 아물고, 몸 안에 새로운 힘이 차오릅니다.</p><HealthChangePreview health={health} maxHealth={maxHealth} nextHealth={springPreviewHealth} nextMaxHealth={springPreviewMaxHealth} effects={['최대 체력 +25', '체력 +25']} /><button className="primary-button" onClick={() => onResolve({ maxHealth: 25 })}>불꽃을 받아들인다</button></EventLayout>
    </ScreenFrame>
  )

  if (event === 'chest' && chestResult) return (
    <ScreenFrame title="보물 상자 결과" subtitle="ENCOUNTER RESULT" dungeonId={dungeonId}>
      <EventLayout illustration={eventIllustrations[event]} fallback="◆" title="보물 상자 결과"><p className="eyebrow">획득 결과</p><h3>{chestResult.doubled ? '상자 깊은 곳에서 황금빛이 폭발했다!' : '상자 안에 골드가 가득하다.'}</h3><div className="chest-gold-result"><GoldAmount amount={chestResult.gold} suffix=" 골드" /></div><p>획득한 골드는 이번 원정에 즉시 추가됩니다.</p><button className="primary-button" onClick={() => onResolve({ gold: chestResult.gold })}>결과 확인</button></EventLayout>
    </ScreenFrame>
  )

  if (event === 'chest') return (
    <ScreenFrame title="봉인된 보물 상자" subtitle="ENCOUNTER" dungeonId={dungeonId}>
      <EventLayout illustration={eventIllustrations[event]} fallback="▣" title="봉인된 보물 상자"><p className="eyebrow">수상한 발견</p><h3>쇠사슬이 끊어진 상자가 놓여 있다.</h3><p>뚜껑 틈으로 금빛이 새어 나옵니다. 함정일 수도 있지만, 원정에는 골드가 필요합니다.</p><div className="event-options"><button className="primary-button" onClick={() => setChestResult(rollGoldChest())}>상자를 연다</button><button className="secondary-button" onClick={() => onResolve({})}>지나친다</button></div></EventLayout>
    </ScreenFrame>
  )

  const purchaseCost = shopCurrentPurchasePrice ?? getShopPurchaseCost(shopPurchaseCount)
  const cleanupCost = shopCurrentCleanupPrice ?? getShopCleanupCost(shopCleanupCount)
  const shopIsExhausted = shopTransactionCount >= MAX_SHOP_TRANSACTIONS
  const canPurchase = !shopIsExhausted && gold >= purchaseCost
  const canCleanup = !shopIsExhausted && gold >= cleanupCost
  const openShopPurchase = () => {
    if (!canPurchase) return
    setShopCurrentPurchasePrice(getShopPurchaseCost(shopPurchaseCount))
    setShopPurchaseCount((count) => count + 1)
    setShopTransactionCount((count) => count + 1)
    setShopOffers(createShopOffers())
    setShopView('purchase')
  }
  const openShopCleanup = () => {
    if (!canCleanup) return
    setShopCurrentCleanupPrice(getShopCleanupCost(shopCleanupCount))
    setShopCleanupCount((count) => count + 1)
    setShopTransactionCount((count) => count + 1)
    setShopView('cleanup')
  }
  const buyShopOffer = (block) => {
    if (gold < purchaseCost) return
    onShopTransaction({ gold: -purchaseCost, addBlock: block })
    setShopCurrentPurchasePrice(null)
    setShopOffers([])
    setShopView('main')
  }
  const removeShopBlock = (blockId) => {
    if (gold < cleanupCost || deck.length <= 5) return
    onShopTransaction({ gold: -cleanupCost, remove: blockId })
    setShopCurrentCleanupPrice(null)
    setShopView('main')
  }

  return (
    <ScreenFrame title="떠돌이 대장간" subtitle="ENCOUNTER" dungeonId={dungeonId} actions={<div className="resource-bar event-resource-bar"><span>♥ {health}/{maxHealth}</span><GoldAmount amount={gold} /></div>}>
      <EventLayout illustration={eventIllustrations[event]} fallback="⚒" title="떠돌이 대장장이"><p className="eyebrow">상점 · 거래 {shopTransactionCount}/{MAX_SHOP_TRANSACTIONS}</p>
        {shopView === 'main' && <>
          <h3>불씨를 빌려 도구를 정비할 수 있다.</h3>
          <p>일반 블록을 구매하거나, 덱에서 블록 하나를 영구적으로 정리할 수 있습니다.</p>
          {shopIsExhausted && <div className="choice-preview">이번 방문에서 가능한 거래를 모두 마쳤습니다.</div>}
          <div className="event-options shop-options">
            <button className="primary-button" disabled={!canPurchase} onClick={openShopPurchase}>블록 구매 · <GoldAmount amount={purchaseCost} /></button>
            <button className="primary-button" disabled={!canCleanup} onClick={openShopCleanup}>블록 정리 · <GoldAmount amount={cleanupCost} /></button>
            <button className="secondary-button" onClick={() => onResolve({})}>상점 나가기</button>
          </div>
        </>}
        {shopView === 'purchase' && <>
          <h3>일반 블록을 고르세요.</h3>
          <p>이번 구매 가격은 <GoldAmount amount={purchaseCost} />입니다.</p>
          <div className="event-options rest-image-options shop-offers" aria-label="구매 가능한 블록">
            {shopOffers.map((block) => <button className="secondary-button" key={block.id} disabled={gold < purchaseCost} onClick={() => buyShopOffer(block)} aria-label={`${block.name} 구매 · ${purchaseCost} 골드`}><BlockPreview block={block} compact /><span>{colorLabels[block.color]}</span><small>{purchaseCost} Gold</small></button>)}
          </div>
          <button className="text-button" onClick={() => { setShopCurrentPurchasePrice(null); setShopOffers([]); setShopView('main') }}>구매를 취소한다</button>
        </>}
        {shopView === 'cleanup' && <>
          <h3>정리할 블록을 고르세요.</h3>
          <p>선택한 블록은 덱에서 영구적으로 제거됩니다. 비용은 <GoldAmount amount={cleanupCost} />입니다.</p>
          <div className="deck-strip" aria-label={`보유 블록 ${deck.length}개`}>
            {deck.map((block) => <button aria-label={`${block.name} 정리 · ${cleanupCost} 골드`} disabled={gold < cleanupCost || deck.length <= 5} key={block.id} onClick={() => removeShopBlock(block.id)}><BlockPreview block={block} compact /></button>)}
          </div>
          <button className="text-button" onClick={() => { setShopCurrentCleanupPrice(null); setShopView('main') }}>정리를 취소한다</button>
        </>}
      </EventLayout>
    </ScreenFrame>
  )
}
