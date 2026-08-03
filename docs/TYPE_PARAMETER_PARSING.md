# Blockable 공통 효과 Type·Parameter 파싱 기준

이 문서는 Block Designer와 Monster Designer가 출력하는 JSON 효과 객체를 메인 게임이
해석하는 기준과 현재 지원 상태를 정리한다.

`effect_id`, `effect_name`, `description`은 식별·표시·검토를 위한 메타데이터다.
실제 실행 방식은 `type`, `target`, `value`, `parameters.id`, `duration`, `intensify`로
결정한다.

새로운 `type` 또는 `parameters.id`가 발견되면 기존 효과에 임의로 연결하지 않고
사용자에게 알린 뒤 지원 규칙을 확정한다.

---

## 0. 기본 구조

```json
{
  "effect_id": "직접 설정",
  "effect_name": "직접 설정",
  "description": "직접 설정",
  "target": "self",
  "value": 0,
  "type": "BASE_DAMAGE",
  "parameters": {
    "id": "NONE",
    "duration": 0,
    "intensify": 0
  }
}
```

---

## 1. `target` 인자

| 값 | 의미 |
|---|---|
| `self` | 자신 |
| `SELECTED` | 선택한 기준 대상 1개 |
| `Lx` | 기준 대상과 왼쪽 x개까지 |
| `Rx` | 기준 대상과 오른쪽 x개까지 |
| `Bx` | 기준 대상과 양쪽 x개까지 |
| `all` | 살아 있는 전체 대상 |

예시:

- `L1` → 기준 대상 + 왼쪽 1개
- `R2` → 기준 대상 + 오른쪽 2개
- `B1` → 기준 대상 + 왼쪽 1개 + 오른쪽 1개

`ENEMY`는 `SELECTED`, `ALL_ENEMIES`는 `all`의 호환 별칭으로 파싱할 수 있다.
범위 밖 슬롯, 빈 슬롯과 사망한 대상은 실제 효과 대상에서 제외한다.

---

## 2. `value` 인자

- 정수형을 기본 입력 규격으로 사용한다.
- 양수, 0, 음수를 허용한다.
- 피해량, 회복량, 능력치 증감량, 횟수 등 실제 계산값을 의미한다.
- Type마다 `value`의 의미가 다르므로 아래 표의 Type별 규칙을 적용한다.
- 피해 계산 결과가 음수이면 실제 적용 직전에 0으로 보정한다.

---

## 3. `duration`과 `intensify` 공통 의미

일반적인 `duration` 값은 다음과 같다. 단, Type별 고유 규칙이 있으면 그 규칙이
우선한다.

| 값 | 일반 의미 |
|---:|---|
| `0` | 즉시 적용 또는 1회 적용 |
| `1+` | 지정한 턴 수만큼 유지 |
| `-1` | 현재 전투가 끝날 때까지 유지 |
| `-2` | 자동 만료되지 않는 영구 적용 |

`intensify`는 실제 계산값인 `value`와 별도로 효과의 단계, 스택 또는 타격 횟수를
나타낸다.

---

## 4. Type별 파싱 표

| `type` | `value` | `parameters.id` | `duration` | `intensify` |
|---|---|---|---|---|
| `BASE_DAMAGE` | 기본 공격 1타 피해 B | `NONE` | `0` | `0` |
| `BASE_HIT_COUNT` | 기본 공격 1타 피해 B에 더할 값 | `CURRENT_ACTION` | `0` | 최종 기본 공격 횟수 H. 1 이상의 정수 |
| `INDEPENDENT_DAMAGE` | 기본 공격 뒤 별도 실행할 독립 피해 A | `NONE` | `0` | `0` |
| `BLOCK` | 획득할 방어도 | `NONE` | `0` | `0` |
| `RECOVERY` | 회복량 | `NONE` | `0` | `0` |
| `STATUS_DAMAGE` | 발동당 상태 피해 기준값 | `BURN`, `POISON`, `BLEEDING` | 상태별 고유 규칙 | 상태 강도 또는 스택 |
| `DEBUFF` | 능력치 감소율 또는 받는 피해 증가율 | `ATTACK_REDUCTION`, `DAMAGE_TAKEN_INCREASE` | 현재 스택 감소 규칙이 우선 | 디버프 강도 또는 스택 |
| `CROWD_CONTROL` | `STUN`에서는 사용하지 않음. 향후 제어에 별도 계산값이 있을 때 사용 | `STUN`, `FREEZE`, `ACTION_LOCK` | 제어별 고유 규칙 | 제어 강도. `STUN`은 1 고정 |
| `BUFF` | 능력치 증가값 | `DAMAGE_BONUS`, `ATTACK_MULTIPLIER` | 버프 유지 턴 | 버프 강도 또는 스택 |
| `EXTRA_TURN` | 추가 턴 또는 추가 행동 수 N | `PLAYER_TURN`, `CURRENT_ACTION` | 무시하고 `0`으로 정규화 | 무시하고 `1`로 정규화 |
| `DECK_CAPACITY` | 덱 용량 증감값 N | `MAIN_DECK` | 무시하고 `0`으로 정규화 | 무시하고 `1`로 정규화 |
| `DRAW` | 주머니에서 추가로 뽑을 블록 수 N | `MAIN_DECK` | 무시하고 `0`으로 처리 | 무시하고 `1`로 처리 |
| `PLACEMENT_COUNT` | 이번 턴의 블록 배치 가능 횟수 증감값 N | `BLOCK_PLACEMENT` | 무시하고 `0`으로 정규화 | 무시하고 `1`로 정규화 |

### 4.1 `BASE_HIT_COUNT`

```text
value = 2
parameters.intensify = 3

결과: B에 2를 더하고 총 H=3회 공격
```

내부 구현에서 기본 1회에 더할 횟수를 `intensify - 1`로 저장할 수 있지만,
JSON과 외부 표시는 `intensify` 자체를 최종 H로 해석한다.

### 4.2 `STATUS_DAMAGE / BLEEDING`

- 플레이어가 받는 피해: 이번 턴에 사용한 블록 개수 × 출혈 스택
- 몬스터가 받는 피해: JSON `value` × 출혈 스택
- 블록이 차지하는 칸 수가 아니라 사용한 블록 개수를 사용한다.
- 방어도를 무시한다.
- 피해 처리 후 스택을 1 감소시킨다.
- `duration`은 레이어의 최대 유지 기간으로 파싱할 수 있지만 스택 감소 규칙을
  대체하지 않는다.

### 4.3 `STATUS_DAMAGE / BURN`

- `value`는 현재 화상 피해 계산에 사용하지 않는다.
- 피해량은 감소 전 화상 스택 수다.
- 일반 피해처럼 방어도로 막을 수 있다.
- 피해 처리 후 스택을 `floor(현재 스택 / 2)`로 감소시킨다.
- 별도 지속 턴을 사용하지 않으므로 `duration`을 무시한다.

### 4.4 `STATUS_DAMAGE / POISON`

- `value`는 발동당 중독 피해량으로 사용할 예정이다.
- `duration`은 지속 턴, `intensify`는 중독 강도로 예약한다.
- 현재 런타임 효과는 구현하지 않았다.

### 4.5 `DEBUFF / ATTACK_REDUCTION`

- 올바른 ID는 `ATTACK_REDUCTION`이다.
- `ATTACK_REDUNCTION`은 오타이며 지원 ID가 아니다.
- `value=10`과 `value=0.1`을 모두 10%로 정규화한다.
- 약화 강도를 `intensify`로 적용한다.
- `D = max(0, 1 - 정규화한 value × intensify)`로 계산한다.
- 새로 적용된 스택은 적용 턴에 보호하고 다음 턴부터 턴 종료마다 1스택 감소한다.
- 해당 턴 피해 계산에 실제 참여했는지는 감소 조건으로 사용하지 않는다.

### 4.6 `DEBUFF / DAMAGE_TAKEN_INCREASE`

- `value=10`과 `value=0.1`을 모두 10%로 정규화한다.
- 상처 강도를 `intensify`로 적용한다.
- `W = 1 + 정규화한 value × intensify`로 계산한다.
- 새로 적용된 스택은 적용 턴에 보호하고 다음 턴부터 턴 종료마다 1스택 감소한다.
- 해당 턴 피해 계산에 실제 참여했는지는 감소 조건으로 사용하지 않는다.

### 4.7 `CROWD_CONTROL / STUN`

- `value`는 무시한다.
- `duration` 입력과 관계없이 행동 1회까지 유지한다.
- `intensify`는 1로 강제한다.
- 활성 중에는 중첩하거나 갱신하지 않는다.
- 행동을 한 번 건너뛴 뒤 제거한다.

### 4.8 `BUFF`

- `DAMAGE_BONUS`: 현재 무효 처리한다. JSON 로딩을 위해 허용될 수 있으나 실행
  목록에서 제외하고 경고한다.
- `ATTACK_MULTIPLIER`: M 배율 증가용 예약 ID이며 현재 미구현이다.

`POISON`, `FREEZE`, `ACTION_LOCK`, `ATTACK_MULTIPLIER`는 설계 예약 ID다. 현재 런타임
검증기의 지원 ID 목록에는 없으므로 JSON에 입력하면 검증 오류가 발생한다.

`RAGE`는 현재 게임 규칙에서 삭제된 레거시 ID다. 신규 블록·몬스터 JSON과 공통
효과 파싱 규격에서 사용하지 않는다.

### 4.9 자원 Type

- `EXTRA_TURN`: 블록에서는 플레이어 추가 턴, 몬스터 능력에서는 해당 몬스터의
  추가 행동으로 사용할 수 있다.
- `DECK_CAPACITY`: 값은 파싱·보존하지만 효과에 의한 실제 덱 용량 변경은 현재
  구현하지 않았다. 몬스터 능력에서는 무시한다.
- `DRAW`: 블록 효과에서만 적용하며 몬스터 능력에서는 무시한다.
- `PLACEMENT_COUNT`: 블록 효과에서만 적용하며 몬스터 능력에서는 무시한다.

---

## 5. `parameters.id` 목록과 지원 상태

```text
BASE_DAMAGE
└─ NONE : 별도 ID 사용 안 함

BASE_HIT_COUNT
└─ CURRENT_ACTION : 현재 기본 공격의 B와 H

INDEPENDENT_DAMAGE
└─ NONE : 별도 ID 사용 안 함

BLOCK
└─ NONE : 별도 ID 사용 안 함

RECOVERY
└─ NONE : 별도 ID 사용 안 함

STATUS_DAMAGE
├─ BURN : 화상
├─ POISON : 독 (예약, 미구현)
└─ BLEEDING : 출혈

DEBUFF
├─ ATTACK_REDUCTION : 약화
└─ DAMAGE_TAKEN_INCREASE : 상처

CROWD_CONTROL
├─ STUN : 기절
├─ FREEZE : 냉동 (예약, 미구현)
└─ ACTION_LOCK : 행동 정지 (예약, 미구현)

BUFF
├─ DAMAGE_BONUS : 직접 피해 추가 (무효 처리)
└─ ATTACK_MULTIPLIER : 공격 배율 증가 (예약, 미구현)

EXTRA_TURN
├─ PLAYER_TURN : 플레이어 추가 턴
└─ CURRENT_ACTION : 현재 행동 주체의 추가 행동

DECK_CAPACITY
└─ MAIN_DECK : 플레이어 주 덱 용량 (효과 실행 미구현)

DRAW
└─ MAIN_DECK : 플레이어 주머니에서 추가 드로우

PLACEMENT_COUNT
└─ BLOCK_PLACEMENT : 거푸집 블록 배치 가능 횟수
```

예약·미구현 또는 무효 처리된 ID를 다른 효과에 대신 연결하지 않는다.
