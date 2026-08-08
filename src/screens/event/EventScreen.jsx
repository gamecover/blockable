import { useState } from 'react'
import { ScreenFrame } from '../../components/ui/ScreenFrame.jsx'
import { GoldAmount } from '../../components/ui/GoldAmount.jsx'
import {
  createShopOffers,
  getShopPurchaseCost,
  MAX_SHOP_TRANSACTIONS,
  rollGoldChest,
  SHOP_CLEANUP_COST,
} from '../../game/systems/eventSystem.js'
import { BlockPreview } from '../../components/ui/BlockPreview.jsx'
import {
  changeBlockShape,
  infuseBlockColor,
  isModifiableStandardBlock,
  STANDARD_BLOCK_COLORS,
  STANDARD_BLOCK_SHAPES,
} from '../../game/systems/blockModificationSystem.js'
import eventFrame from './assets/pictures/event_base_innerframe.png'
import oldMoleImage from '../../../Assets/Event/old_mole.png'
import randomChestImage from '../../../Assets/Event/random_chest.png'
import relexHpImage from '../../../Assets/Event/relex_hp.png'
import shopMerchantImage from '../../../Assets/Event/shop_merchant.png'

const colorLabels = { nature: '자연', water: '물', fire: '불', steel: '강철' }
const shapeLabels = { '001': 'I형', '002': 'L형', '003': 'O형' }
const EventBaseFrame = () => <img className="event-card__base-frame" src={eventFrame} alt="" aria-hidden="true" />
const eventIllustrations = Object.freeze({
  rest: oldMoleImage,
  chest: randomChestImage,
  spring: relexHpImage,
  shop: shopMerchantImage,
})

function EventIllustration({ event, fallback }) {
  const image = eventIllustrations[event]

  return (
    <div className="event-illustration event-illustration-slot">
      {image ? <img className="event-illustration__image" src={image} alt="" /> : fallback}
    </div>
  )
}

function EventLayout({ event, fallback, title, children }) {
  return (
    <div className="event-card">
      <EventBaseFrame />
      <header className="event-card__header-slot"><h2>{title}</h2></header>
      <EventIllustration event={event} fallback={fallback} />
      <article>{children}</article>
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
  const [shopCurrentPurchasePrice, setShopCurrentPurchasePrice] = useState(null)
  const [shopOffers, setShopOffers] = useState([])
  const modifiableBlocks = deck.filter(isModifiableStandardBlock)
  const restBlock = modifiableBlocks.find(({ id }) => id === restBlockId)

  if (event === 'rest') return (
    <ScreenFrame title="용광로의 쉼터" subtitle="REST" dungeonId={dungeonId}>
      <EventLayout event={event} fallback="♥" title="용광로의 쉼터"><p className="eyebrow">휴식 지점</p><h3>열기가 잦아든 작업장이 길가에 남아 있다.</h3><p>몸을 회복하거나, 불씨를 이용해 일반 블록 하나를 다시 벼릴 수 있습니다. 한 가지 작업만 선택할 수 있습니다.</p>
        {!restAction && <div className="event-options rest-options">
          <button className="primary-button" onClick={() => setRestAction('color')}>속성 주입</button>
          <button className="primary-button" onClick={() => onResolve({ heal: 20 })}>체력 +20</button>
          <button className="primary-button" onClick={() => setRestAction('shape')}>모양 변환</button>
          <button className="secondary-button" onClick={onDefer}>지금은 사용하지 않는다</button>
        </div>}
        {restAction && !restBlock && <>
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
      <EventLayout event={event} fallback="♨" title="생명의 샘"><p className="eyebrow">희귀 이벤트</p><h3>돌 틈에서 푸른 불꽃이 솟는다.</h3><p>불꽃에 손을 담그자 오래된 상처가 아물고, 몸 안에 새로운 힘이 차오릅니다.</p><div className="choice-preview">최대 체력 +25 · 체력 완전 회복</div><button className="primary-button" onClick={() => onResolve({ maxHealth: 25 })}>불꽃을 받아들인다</button></EventLayout>
    </ScreenFrame>
  )

  if (event === 'chest' && chestResult) return (
    <ScreenFrame title="보물 상자 결과" subtitle="ENCOUNTER RESULT" dungeonId={dungeonId}>
      <EventLayout event={event} fallback="◆" title="보물 상자 결과"><p className="eyebrow">획득 결과</p><h3>{chestResult.doubled ? '상자 깊은 곳에서 황금빛이 폭발했다!' : '상자 안에 골드가 가득하다.'}</h3><div className="chest-gold-result"><GoldAmount amount={chestResult.gold} suffix=" 골드" /></div><p>획득한 골드는 이번 원정에 즉시 추가됩니다.</p><button className="primary-button" onClick={() => onResolve({ gold: chestResult.gold })}>결과 확인</button></EventLayout>
    </ScreenFrame>
  )

  if (event === 'chest') return (
    <ScreenFrame title="봉인된 보물 상자" subtitle="ENCOUNTER" dungeonId={dungeonId}>
      <EventLayout event={event} fallback="▣" title="봉인된 보물 상자"><p className="eyebrow">수상한 발견</p><h3>쇠사슬이 끊어진 상자가 놓여 있다.</h3><p>뚜껑 틈으로 금빛이 새어 나옵니다. 함정일 수도 있지만, 원정에는 골드가 필요합니다.</p><div className="event-options"><button className="primary-button" onClick={() => setChestResult(rollGoldChest())}>상자를 연다</button><button className="secondary-button" onClick={() => onResolve({})}>지나친다</button></div></EventLayout>
    </ScreenFrame>
  )

  const purchaseCost = shopCurrentPurchasePrice ?? getShopPurchaseCost(shopPurchaseCount)
  const shopIsExhausted = shopTransactionCount >= MAX_SHOP_TRANSACTIONS
  const openShopPurchase = () => {
    if (shopIsExhausted) return
    setShopCurrentPurchasePrice(getShopPurchaseCost(shopPurchaseCount))
    setShopPurchaseCount((count) => count + 1)
    setShopTransactionCount((count) => count + 1)
    setShopOffers(createShopOffers())
    setShopView('purchase')
  }
  const openShopCleanup = () => {
    if (shopIsExhausted) return
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
    if (gold < SHOP_CLEANUP_COST || deck.length <= 5) return
    onShopTransaction({ gold: -SHOP_CLEANUP_COST, remove: blockId })
    setShopView('main')
  }

  return (
    <ScreenFrame title="떠돌이 대장간" subtitle="ENCOUNTER" dungeonId={dungeonId} actions={<div className="resource-bar event-resource-bar"><span>♥ {health}/{maxHealth}</span><GoldAmount amount={gold} /></div>}>
      <EventLayout event={event} fallback="⚒" title="떠돌이 대장장이"><p className="eyebrow">상점 · 거래 {shopTransactionCount}/{MAX_SHOP_TRANSACTIONS}</p>
        {shopView === 'main' && <>
          <h3>불씨를 빌려 도구를 정비할 수 있다.</h3>
          <p>일반 블록을 구매하거나, 덱에서 블록 하나를 영구적으로 정리할 수 있습니다.</p>
          {shopIsExhausted && <div className="choice-preview">이번 방문에서 가능한 거래를 모두 마쳤습니다.</div>}
          <div className="event-options shop-options">
            <button className="primary-button" disabled={shopIsExhausted} onClick={openShopPurchase}>블록 구매 · <GoldAmount amount={purchaseCost} /></button>
            <button className="primary-button" disabled={shopIsExhausted} onClick={openShopCleanup}>블록 정리 · <GoldAmount amount={SHOP_CLEANUP_COST} /></button>
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
          <p>선택한 블록은 덱에서 영구적으로 제거됩니다. 비용은 <GoldAmount amount={SHOP_CLEANUP_COST} />입니다.</p>
          <div className="deck-strip" aria-label={`보유 블록 ${deck.length}개`}>
            {deck.map((block) => <button aria-label={`${block.name} 정리 · ${SHOP_CLEANUP_COST} 골드`} disabled={gold < SHOP_CLEANUP_COST || deck.length <= 5} key={block.id} onClick={() => removeShopBlock(block.id)}><BlockPreview block={block} compact /></button>)}
          </div>
          <button className="text-button" onClick={() => setShopView('main')}>정리를 취소한다</button>
        </>}
      </EventLayout>
    </ScreenFrame>
  )
}
