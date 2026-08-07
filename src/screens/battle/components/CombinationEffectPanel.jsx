import damageReportFrame from '../../../assets/pictures/ui/damage_report.png'
import { describeFinalBlockEffects } from '../../../game/systems/blockEffectSystem.js'

export function CombinationEffectPanel({ effects }) {
  const synergyLines = effects.colorSynergy?.labels ?? []
  const effectSummary = describeFinalBlockEffects(effects)

  return (
    <section className="combination-effect-panel" aria-label="조합 효과">
      <img className="combination-effect-panel__frame" src={damageReportFrame} alt="" aria-hidden="true" />
      <strong className="combination-effect-panel__title">조합 효과</strong>
      <div className="combination-effect-panel__content">
        {synergyLines.length > 0 && (
          <p className="combination-effect-panel__synergy">
            {synergyLines.map(({ text }) => text).join(' · ')}
          </p>
        )}
        <p>{effectSummary || '적용 효과 없음'}</p>
        {effects.combinationDetails.length > 0 && (
          <p className="combination-effect-panel__combinations">
            {effects.combinationDetails.map(({ name }) => name).join(' · ')}
          </p>
        )}
      </div>
    </section>
  )
}
