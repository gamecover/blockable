import { useState } from 'react'
import { ScreenFrame } from '../../components/ui/ScreenFrame.jsx'
import { rollGoldChest } from '../../game/systems/eventSystem.js'
import { BlockPreview } from '../../components/ui/BlockPreview.jsx'

export function EventScreen({ event, gold, health, maxHealth, deck, onResolve }) {
  const [chestResult, setChestResult] = useState(null)

  if (event === 'rest') return (
    <ScreenFrame title="용광로의 쉼터" subtitle="REST">
      <div className="event-card rest"><div className="event-illustration">♥</div><article><p className="eyebrow">휴식 지점</p><h3>열기가 잦아든 작업장이 길가에 남아 있다.</h3><p>잠시 장비를 내려놓고 숨을 고릅니다. 식어 가는 불씨의 온기가 지친 몸을 회복시킵니다.</p><div className="choice-preview">현재 체력 20 회복 · {health}/{maxHealth}</div><button className="primary-button" onClick={() => onResolve({ heal: 20 })}>휴식을 마치고 이동한다</button></article></div>
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
      <div className="event-card shop"><div className="event-illustration">⚒</div><article><p className="eyebrow">상점</p><h3>불씨를 빌려 도구를 정비할 수 있다.</h3><p>가장 거슬리는 블록 하나를 녹여 주머니를 가볍게 만드세요.</p><div className="deck-strip" aria-label={`보유 블록 ${deck.length}개`}>{deck.map((block) => <button aria-label={`${block.name} 삭제 · ${cost} 골드`} disabled={gold < cost || deck.length <= 5} key={block.id} onClick={() => onResolve({ remove: block.id, gold: -cost })}><BlockPreview block={block} compact /><small>◆ {cost}</small></button>)}</div><button className="text-button" onClick={() => onResolve({})}>아무것도 하지 않고 떠난다</button></article></div>
    </ScreenFrame>
  )
}
