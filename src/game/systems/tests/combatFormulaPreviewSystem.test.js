import { describe, expect, it } from 'vitest'
import { resolveCombatFormulaPreview } from '../combatFormulaPreviewSystem.js'

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
    expect(preview.lines).toEqual([
      '기본 공격(B) 21 = ((10 + 2) × 1 × 0.5 × 1.2) × 3',
      '독립 공격(A) 3 = 5 × 1 × 0.5 × 1.2',
      '상태 갱신 · S: 분노 1 · C: 약화 2',
    ])
  })
})
