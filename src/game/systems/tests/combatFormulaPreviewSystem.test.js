import { describe, expect, it } from 'vitest'
import { resolveCombatFormulaPreview } from '../combatFormulaPreviewSystem.js'
import { describeFinalBlockEffects } from '../blockEffectSystem.js'

describe('combat formula preview', () => {
  it('shows the calculated B, A, H and status update channels', () => {
    const preview = resolveCombatFormulaPreview({
      baseDamageEffects: [{ amount: 10 }],
      independentDamageEffects: [{ amount: 5 }],
      hitCountModifier: 1,
      playerStatuses: [{ id: 'rage', name: '분노', stacks: 1 }],
      statuses: [{ id: 'weakness', name: '약화', stacks: 2 }],
      statusDamageEffects: [],
    }, {
      damageBonus: 2,
      attackMultiplier: 1,
      attackReductionMultiplier: 0.5,
      woundMultiplier: 1.2,
      hitCountBonus: 1,
    })

    expect(preview.baseResult).toBe(21)
    expect(preview.independentResult).toBe(3)
    expect(preview.rawBaseResult).toBe(21)
    expect(preview.rawIndependentResult).toBe(3)
    expect(preview.lines).toEqual([
      '기본 공격(B) 21 = ((10 + 2) × 1 × 0.5 × 1.2) × 3',
      '독립 공격(A) 3 = 5 × 1 × 0.5 × 1.2',
      '상태 갱신 · S: 분노 1 · C: 약화 2',
    ])
  })

  it('retains negative raw values while keeping applied preview damage at zero', () => {
    const preview = resolveCombatFormulaPreview({
      baseDamageEffects: [{ amount: -10 }],
      independentDamageEffects: [{ amount: -8 }],
      hitCountModifier: 0,
      playerStatuses: [],
      statuses: [],
      statusDamageEffects: [],
    })

    expect(preview.baseResult).toBe(0)
    expect(preview.independentResult).toBe(0)
    expect(preview.rawBaseResult).toBe(-10)
    expect(preview.rawIndependentResult).toBe(-8)
  })

  it('keeps negative raw B and A values available to the effect summary', () => {
    const effects = {
      baseDamageEffects: [{ amount: -23, range: 'single' }],
      independentDamageEffects: [{ amount: -10, range: 'single' }],
      hitCountModifier: 0,
      playerStatuses: [],
      statuses: [],
      statusDamageEffects: [],
      colorSynergy: { labels: [] },
      buffs: [],
      debuffs: [],
      armor: 0,
      healing: 0,
    }
    const preview = resolveCombatFormulaPreview(effects)

    expect(describeFinalBlockEffects(effects, {
      baseDamage: preview.rawBaseResult,
      independentDamage: preview.rawIndependentResult,
    })).toContain('기본 데미지(B) 0 (계산 -23)')
    expect(describeFinalBlockEffects(effects, {
      baseDamage: preview.rawBaseResult,
      independentDamage: preview.rawIndependentResult,
    })).toContain('독립 데미지(A) 0 (계산 -10)')
  })
})
