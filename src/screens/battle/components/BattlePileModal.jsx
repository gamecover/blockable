import { BlockPreview } from '../../../components/ui/BlockPreview.jsx'

export function BattlePileModal({ title, blocks, onClose }) {
  return (
    <div className="battle-pile-modal" role="dialog" aria-modal="true" aria-label={title} onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <section>
        <header>
          <div><b>{title}</b><small>총 {blocks.length}개</small></div>
          <button type="button" onClick={onClose} aria-label={`${title} 닫기`}>×</button>
        </header>
        {blocks.length
          ? <div className="battle-pile-grid">{blocks.map((block) => <div key={block.id} aria-label={block.name} title={block.name}><BlockPreview block={block} compact /></div>)}</div>
          : <p>블록이 없습니다.</p>}
      </section>
    </div>
  )
}
