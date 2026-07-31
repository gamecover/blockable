import { useEffect, useLayoutEffect, useMemo, useState } from 'react'
import { GAME_EVENTS, gameBridge } from '../../game/events/gameEvents.js'

const STEPS = [
  {
    target: 'forge',
    event: 'block-drag-started',
    title: '도구 주머니',
    body: '도구 주머니의 블록을 마우스로 잡아 거푸집 쪽으로 드래그하세요. 블록은 일반적으로 한 턴에 최대 3회까지 거푸집 위에 배치할 수 있습니다.',
  },
  {
    target: 'forge',
    event: 'block-rotated',
    title: '블록 회전',
    body: '블록을 잡은 상태에서 R 키를 눌러 방향을 회전하세요.',
  },
  {
    target: 'forge',
    event: 'block-placed',
    title: '거푸집 배치',
    body: '밝게 표시된 거푸집의 유효한 칸에 블록을 놓으세요.',
  },
  {
    target: 'forge',
    secondaryTarget: 'blueprint',
    event: 'quick-combination-placed',
    resetBoard: true,
    title: '의자 퀵 조합',
    body: '연습 배치를 초기화했습니다. 의자 청사진을 거푸집으로 드래그해 바로 배치하고, 거푸집 옆 예상 효과에서 조합 결과를 확인하세요.',
  },
  {
    target: 'monsters',
    event: 'monster-selected',
    title: '공격 대상',
    body: '잉걸불 슬라임을 선택해 중심 공격 대상으로 지정하세요.',
  },
  {
    target: 'piles',
    title: '남은 블록과 버린 블록',
    body: '두 버튼을 누르면 주머니에 남은 블록과 이번 전투에서 버린 블록을 확인할 수 있습니다.',
  },
  {
    target: 'end-turn',
    event: 'turn-ended',
    title: '턴 종료',
    body: '턴 종료 후 블록 효과가 먼저 처리되고, 살아남은 몬스터가 예고한 행동을 실행합니다.',
  },
  {
    target: 'forge-board',
    event: 'tutorial-board-shrunk',
    waitForEventThenNext: true,
    title: '피해와 거푸집',
    body: '슬라임의 공격을 지켜보세요. 체력이 감소하면 사용할 수 있는 거푸집 칸도 줄어듭니다.',
    completedBody: '공격을 받아 거푸집의 사용 가능 칸이 줄었습니다. 비활성화된 칸에는 다음 블록을 배치할 수 없습니다.',
  },
]

const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value))

const hasSameBounds = (current, next) => current
  && current.left === next.left
  && current.top === next.top
  && current.right === next.right
  && current.bottom === next.bottom

export function TutorialOverlay() {
  const [stepIndex, setStepIndex] = useState(0)
  const [rect, setRect] = useState(null)
  const [curtainRect, setCurtainRect] = useState(null)
  const [secondaryRect, setSecondaryRect] = useState(null)
  const [stepReady, setStepReady] = useState(false)
  const step = STEPS[stepIndex]
  const freeCombat = stepIndex >= STEPS.length
  const hideBlueprint = stepIndex < 3

  useEffect(() => gameBridge.on(GAME_EVENTS.TUTORIAL_ACTION, ({ type }) => {
    const currentStep = STEPS[stepIndex]
    if (currentStep?.event !== type) return
    if (currentStep.waitForEventThenNext) setStepReady(true)
    else setStepIndex((index) => index + 1)
  }), [stepIndex])

  useEffect(() => setStepReady(false), [stepIndex])

  useEffect(() => {
    if (step?.resetBoard) gameBridge.emit(GAME_EVENTS.RESET_BOARD)
  }, [step?.resetBoard])

  useEffect(() => {
    if (freeCombat) {
      gameBridge.emit(GAME_EVENTS.TUTORIAL_ACTION, { type: 'free-combat-started' })
    }
  }, [freeCombat])

  useEffect(() => {
    const blockUnrelatedKeys = (event) => {
      if (freeCombat) return
      const allowedRotation = step?.event === 'block-rotated' && event.code === 'KeyR'
      const allowedDialogKey = ['Tab', 'Enter', 'Space'].includes(event.code)
      if (allowedRotation || allowedDialogKey) return
      event.preventDefault()
      event.stopImmediatePropagation()
    }
    window.addEventListener('keydown', blockUnrelatedKeys, true)
    return () => window.removeEventListener('keydown', blockUnrelatedKeys, true)
  }, [freeCombat, step])

  useLayoutEffect(() => {
    if (freeCombat) return undefined
    let observer = null
    let frame = null
    let target = null

    const measure = () => {
      frame = null
      if (!target) target = document.querySelector(`[data-tutorial-target="${step.target}"]`)
      if (!target) {
        scheduleMeasure()
        return
      }
      const bounds = target.getBoundingClientRect()
      const nextRect = {
        left: Math.max(0, bounds.left - 8),
        top: Math.max(0, bounds.top - 8),
        right: Math.min(window.innerWidth, bounds.right + 8),
        bottom: Math.min(window.innerHeight, bounds.bottom + 8),
      }
      setRect((current) => hasSameBounds(current, nextRect) ? current : nextRect)

      if (step.secondaryTarget) {
        const secondaryTarget = document.querySelector(`[data-tutorial-target="${step.secondaryTarget}"]`)
        if (secondaryTarget) {
          const secondaryBounds = secondaryTarget.getBoundingClientRect()
          const nextSecondaryRect = {
            left: Math.max(0, secondaryBounds.left - 8),
            top: Math.max(0, secondaryBounds.top - 8),
            right: Math.min(window.innerWidth, secondaryBounds.right + 8),
            bottom: Math.min(window.innerHeight, secondaryBounds.bottom + 8),
          }
          setSecondaryRect((current) => hasSameBounds(current, nextSecondaryRect) ? current : nextSecondaryRect)
        }
      } else {
        setSecondaryRect(null)
      }

      if (hideBlueprint) {
        const blueprint = document.querySelector('[data-tutorial-target="blueprint"]')
        if (blueprint) {
          const blueprintBounds = blueprint.getBoundingClientRect()
          const nextCurtainRect = {
            left: Math.max(0, blueprintBounds.left - 4),
            top: Math.max(0, blueprintBounds.top - 4),
            right: Math.min(window.innerWidth, blueprintBounds.right + 4),
            bottom: Math.min(window.innerHeight, blueprintBounds.bottom + 4),
          }
          setCurtainRect((current) => hasSameBounds(current, nextCurtainRect) ? current : nextCurtainRect)
        }
      } else {
        setCurtainRect(null)
      }

      if (!observer && typeof ResizeObserver !== 'undefined') {
        observer = new ResizeObserver(scheduleMeasure)
        observer.observe(target)
      }
    }

    function scheduleMeasure() {
      if (frame === null) frame = window.requestAnimationFrame(measure)
    }

    scheduleMeasure()
    window.addEventListener('resize', scheduleMeasure, { passive: true })
    return () => {
      if (frame !== null) window.cancelAnimationFrame(frame)
      observer?.disconnect()
      window.removeEventListener('resize', scheduleMeasure)
    }
  }, [freeCombat, hideBlueprint, step?.secondaryTarget, step?.target])

  const bubbleStyle = useMemo(() => {
    if (!rect) return undefined
    const width = Math.min(360, window.innerWidth - 32)
    const below = rect.bottom + 18
    const top = below + 180 < window.innerHeight
      ? below
      : Math.max(16, rect.top - 190)
    return {
      width,
      left: clamp(rect.left + (rect.right - rect.left - width) / 2, 16, window.innerWidth - width - 16),
      top,
    }
  }, [rect])

  if (freeCombat) {
    return (
      <aside className="tutorial-free-combat" role="status">
        <small>9 / 9</small>
        <strong>슬라임을 쓰러뜨리세요!</strong>
        <span>이제 배운 조작을 사용해 자유롭게 전투하세요.</span>
      </aside>
    )
  }

  if (!rect) return null
  const width = rect.right - rect.left
  const height = rect.bottom - rect.top
  return (
    <div className="tutorial-overlay" aria-live="polite">
      <div className="tutorial-mask tutorial-mask--top" style={{ height: rect.top }} />
      <div className="tutorial-mask tutorial-mask--left" style={{ top: rect.top, width: rect.left, height }} />
      <div className="tutorial-mask tutorial-mask--right" style={{ top: rect.top, left: rect.right, height }} />
      <div className="tutorial-mask tutorial-mask--bottom" style={{ top: rect.bottom }} />
      {curtainRect && <div
        className="tutorial-blueprint-curtain"
        style={{
          left: curtainRect.left,
          top: curtainRect.top,
          width: curtainRect.right - curtainRect.left,
          height: curtainRect.bottom - curtainRect.top,
        }}
      />}
      <div className="tutorial-highlight" style={{ left: rect.left, top: rect.top, width, height }} />
      {secondaryRect && <div
        className="tutorial-highlight tutorial-highlight--secondary"
        style={{
          left: secondaryRect.left,
          top: secondaryRect.top,
          width: secondaryRect.right - secondaryRect.left,
          height: secondaryRect.bottom - secondaryRect.top,
        }}
      />}
      <aside className="tutorial-speech" style={bubbleStyle} role="dialog" aria-label={`튜토리얼 ${stepIndex + 1}단계`}>
        <small>{stepIndex + 1} / {STEPS.length + 1}</small>
        <strong>{step.title}</strong>
        <p>{stepReady && step.completedBody ? step.completedBody : step.body}</p>
        <div>
          {(!step.event || stepReady) && <button type="button" onClick={() => setStepIndex((index) => index + 1)}>다음</button>}
        </div>
      </aside>
    </div>
  )
}
