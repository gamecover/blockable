import { ScreenFrame } from '../../components/ui/ScreenFrame.jsx'

export function EventScreen({ event, gold, health, maxHealth, deck, onResolve }) {
  if (event === 'spring') return (
    <ScreenFrame title="생명의 샘" subtitle="RARE ENCOUNTER">
      <div className="event-card spring"><div className="event-illustration">♨</div><article><p className="eyebrow">희귀 이벤트</p><h3>돌 틈에서 푸른 불꽃이 솟는다.</h3><p>불꽃에 손을 담그자 오래된 상처가 아물고, 몸 안에 새로운 힘이 차오릅니다.</p><div className="choice-preview">최대 체력 +25 · 체력 완전 회복</div><button className="primary-button" onClick={() => onResolve({ maxHealth: 25 })}>불꽃을 받아들인다</button></article></div>
    </ScreenFrame>
  )

  if (event === 'chest') return (
    <ScreenFrame title="봉인된 보물 상자" subtitle="ENCOUNTER">
      <div className="event-card chest"><div className="event-illustration">▣</div><article><p className="eyebrow">수상한 발견</p><h3>쇠사슬이 끊어진 상자가 놓여 있다.</h3><p>뚜껑 틈으로 금빛이 새어 나옵니다. 함정일 수도 있지만, 원정에는 골드가 필요합니다.</p><div className="event-options"><button className="primary-button" onClick={() => onResolve({ gold: Math.random() < 0.05 ? 300 : 150 })}>상자를 연다</button><button className="secondary-button" onClick={() => onResolve({})}>지나친다</button></div></article></div>
    </ScreenFrame>
  )

  const cost = 50
  return (
    <ScreenFrame title="떠돌이 대장간" subtitle="ENCOUNTER" actions={<div className="resource-bar"><span>♥ {health}/{maxHealth}</span><span>◆ {gold}</span></div>}>
      <div className="event-card shop"><div className="event-illustration">⚒</div><article><p className="eyebrow">상점</p><h3>불씨를 빌려 도구를 정비할 수 있다.</h3><p>가장 거슬리는 블록 하나를 녹여 주머니를 가볍게 만드세요.</p><div className="deck-strip">{deck.slice(0, 8).map((block) => <button disabled={gold < cost || deck.length <= 5} key={block.id} onClick={() => onResolve({ remove: block.id, gold: -cost })}><b>{block.shape}</b><small>◆ {cost}</small></button>)}</div><button className="text-button" onClick={() => onResolve({})}>아무것도 하지 않고 떠난다</button></article></div>
    </ScreenFrame>
  )
}
