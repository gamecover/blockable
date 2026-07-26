# Blockable 몬스터 JSON 게임 적용 지침 - Codex용

분석 원본: `examples/blockable_monster_design.json`
게임 적용 대상: `docs/references/designs/blockable_monster_design.json`
현재 스키마: `1.3.0`
Designer 프로그램 버전: `v1.0.5`
원본 확인일: `2026-07-27`
원본 SHA-256: `bbc56e4955a2b9936dc9330f2eb7f071c9a7efaa2d461ec8c07a1105fb20d340`

이 문서는 다른 Codex가 Blockable 게임 프로젝트에서 Monster Designer의 JSON을
파싱하고 몬스터 출현, 어빌리티, 패턴, 트리거와 페이즈 전환을 구현할 때 따라야 할
최소 계약이다.

Designer 저장소와 Blockable 게임 저장소는 서로 다른 프로젝트일 수 있다. 경로는
각 저장소 루트를 기준으로 해석하며, 게임 저장소의 `AGENTS.md`가 다른 위치나 절차를
지정하면 해당 지침을 우선한다.

## 1. Codex가 가장 먼저 할 일

1. 게임 저장소의 `AGENTS.md`와 필수 문서를 모두 읽는다.
2. 이 문서와 적용 대상 `blockable_monster_design.json`을 끝까지 읽는다.
3. 대상 JSON의 실제 `schema_version`, `invalid`, 배열과 ID를 직접 확인한다.
4. `schema_version`이 게임 로더가 지원하는 버전인지 검사한다.
5. 최상위 `invalid === true`이면 게임 실행용 데이터로 거부한다.
6. 사용할 몬스터의 `invalid === true`도 명확한 오류로 거부한다.
7. 몬스터 수치와 패턴을 게임 코드에 중복 하드코딩하지 않는다.
8. JSON을 한 번 로드하고 공통 정의와 몬스터를 ID 기반 Map으로 인덱싱한다.
9. 표시 이름이나 설명을 실행 규칙으로 해석하지 않는다.
10. 원본 JSON은 명시적인 데이터 수정 요청이 없으면 변경하지 않는다.

게임 적용 작업을 시작하는 Codex에는 다음처럼 요청할 수 있다.

```text
게임 저장소의 AGENTS.md와 필수 문서를 먼저 읽으세요.
docs/references/designs/blockable_monster_design.json과
BLOCKABLE_MONSTER_DESIGN_CODEX_INTERACTION_INSTRUCTION.md를 읽고 몬스터
데이터 로더를 구현하세요.

schema_version 1.3.0과 invalid 상태를 검사하고, 공통 정의와 monsters를 ID Map으로
인덱싱하세요. 출현 조건, difficulty_tier, 층별 stats, 어빌리티 효과, Intent,
strict/random 패턴, fallback, 트리거 우선순위와 페이즈 전환을 JSON 기준으로
처리하세요. display_name이나 description을 실행 로직으로 해석하지 마세요.
invalid 데이터와 알 수 없는 참조는 조용히 무시하지 말고 경로가 포함된 오류로
보고하세요. 관련 단위 테스트를 작성하고 전체 테스트 결과를 보고하세요.
```

## 2. 파일과 버전 계약

Designer의 기본 저장 파일명:

```text
blockable_monster_design.json
```

게임 저장소의 권장 위치:

```text
docs/references/designs/blockable_monster_design.json
```

현재 최상위 구조:

```json
{
  "schema_version": "1.3.0",
  "invalid": false,
  "metadata": {},
  "monster_grades": [],
  "effect_definitions": [],
  "condition_definitions": [],
  "event_definitions": [],
  "intent_definitions": [],
  "trigger_response_definitions": [],
  "monsters": []
}
```

프로그램 버전, 기획 문서 버전과 JSON 스키마 버전은 서로 다른 체계다. 게임 로더는
Designer 프로그램 버전이 아니라 JSON의 `schema_version`을 판정한다.

구버전 데이터 마이그레이션을 게임 로더가 임의로 추측하지 않는다. Designer는 기존
단일 `tier`를 `difficulty_tier.min/max`로 변환하지만, 게임은 적용 대상 파일의 실제
필드를 기준으로 읽는다.

## 3. 현재 저장 파일 상태

이 절은 `examples/blockable_monster_design.json`을 직접 파싱해 작성했다. 원본의
SHA-256이 문서 상단 값과 달라지면 개수, ID, 몬스터 목록과 데이터 주의사항을 다시
집계해야 한다.

| 항목 | 개수 |
|---|---:|
| 몬스터 등급 | 3 |
| 효과 정의 | 4 |
| 조건 정의 | 5 |
| 이벤트 정의 | 4 |
| Intent 정의 | 8 |
| 트리거 반응 정의 | 5 |
| 몬스터 | 13 |

최상위 `invalid`와 13개 몬스터의 `invalid`는 모두 `false`다. 현재 Designer
검증기로 불러왔을 때 오류와 경고가 없다. 다만 현재 Designer 검증기는 enum option과
외부 상태 ID 레지스트리까지 검사하지 않으므로 이것이 게임 로더의 전체 검증을
대체하지 않는다. 아래 효과 및 상태 ID 주의사항을 별도로 확인한다.

현재 몬스터:

| ID | 표시 이름 | 등급 | 출현 층 | 출현 난이도 | HP | 페이즈 |
|---|---|---|---|---|---:|---:|
| `ember_slime` | 잉걸불 슬라임 | `normal` | 1 | 1~1 | 80 | 2 |
| `cinder_bat` | 잔불 박쥐 | `normal` | 1 | 1~1 | 50 | 2 |
| `rusty_golem` | 녹슨 골렘 | `normal` | 1~2 | 1~2 | 90 | 1 |
| `explosive_soul` | 폭발하는 영혼 | `normal` | 2~3 | 2~3 | 100 | 1 |
| `hanging_ashes` | 매달리는 잿더미 | `normal` | 2~3 | 2~3 | 120 | 2 |
| `smog_wraith` | 매연 망령 | `normal` | 3 | 3~3 | 130 | 1 |
| `flame_ghoul` | 화염 구울 | `named` | 2 | 2~2 | 50 | 2 |
| `lava_heart` | 용암 심장 | `normal` | 2~3 | 2~3 | 150 | 2 |
| `anvil_guardian` | 모루의 수호자 | `named` | 3 | 3~3 | 130 | 2 |
| `molten_drake` | 녹아내린 드레이크 | `boss` | 1 | 1~1 | 200 | 2 |
| `seething_furnace_knight` | 끓어오르는 용광로 기사 | `boss` | 1~2 | 1~2 | 200 | 1 |
| `ashen_fire_dragon_of_oblivion` | 잿빛 사멸의 화룡 | `boss` | 2~3 | 2~3 | 220 | 2 |
| `god_of_the_eternal_forge` | 영원의 주조신 | `normal` | 3 | 1~1 | 50 | 2 |

표시 이름을 보고 등급을 바꾸지 않는다. 예를 들어 `god_of_the_eternal_forge`의
표시 이름은 영원의 주조신이지만 실제 `grade_id`는 `normal`이다. 출현 층과
`difficulty_tier`가 다를 수도 있으므로 한쪽으로 다른 쪽을 덮어쓰지 않는다.

이 개수와 목록은 현재 저장 파일 스냅샷을 설명하기 위한 것이다. 게임 코드나 타입에
하드코딩하지 않고 적용 대상 JSON을 매번 직접 집계한다.

현재 공통 정의 ID:

| 배열 | ID |
|---|---|
| `monster_grades` | `normal`, `named`, `boss` |
| `effect_definitions` | `deal_damage`, `heal`, `gain_block`, `apply_status` |
| `condition_definitions` | `floor`, `dungeon_id`, `difficulty`, `monster_hp_ratio`, `turn` |
| `event_definitions` | `battle_started`, `turn_started`, `monster_hp_changed`, `ability_used` |
| `intent_definitions` | `attack`, `attack_debuff`, `defense`, `buff`, `debuff`, `special`, `self_destruct`, `unknown` |
| `trigger_response_definitions` | `immediate`, `replace_intent`, `queue_next`, `append_action`, `transition_phase` |

현재 파일에서 실제 사용된 항목은 정의 목록의 부분집합일 수 있다. 정의됐지만 현재
몬스터가 사용하지 않는 항목도 삭제하거나 미지원으로 간주하지 않는다.

## 4. ID와 표시 문자열

판정과 참조에는 반드시 ID를 사용한다.

```text
monster.id
grade_id
effect_id
condition_id
event_id
ability_id
phase_id
trigger.id
intent.type
response.type
```

`display_name`, `description`, `developer_notes`는 UI 표시와 제작자 설명이다. 한글
이름이나 설명을 보고 효과, 수치, 대상 또는 전환 규칙을 추측하지 않는다.

ID 이름 공간:

- 몬스터 ID: 프로젝트 전체에서 고유
- grade/effect/condition/event/intent/response ID: 각 공통 정의 배열에서 고유
- 어빌리티 ID: 해당 몬스터 안에서 고유
- 페이즈 ID: 해당 몬스터의 behavior 안에서 고유
- 트리거 ID: 해당 몬스터의 행동 범위에서 고유

이름 공간이 다르면 문자열이 같아도 같은 개념으로 합치지 않는다.

## 5. 권장 로더 구조

JSON을 파싱한 뒤 최소한 다음 인덱스를 만든다.

```ts
type MonsterIndexes = {
  gradeById: Map<string, MonsterGradeDefinition>;
  effectById: Map<string, EffectDefinition>;
  conditionById: Map<string, ConditionDefinition>;
  eventById: Map<string, EventDefinition>;
  intentById: Map<string, IntentDefinition>;
  responseById: Map<string, TriggerResponseDefinition>;
  monsterById: Map<string, MonsterDefinition>;
};
```

몬스터를 전투에 배치할 때 추가로 만든다.

```ts
type MonsterRuntimeIndexes = {
  abilityById: Map<string, AbilityDefinition>;
  phaseById: Map<string, PhaseDefinition>;
  triggerById: Map<string, TriggerDefinition>;
};
```

중복 ID가 있으면 나중 항목으로 덮어쓰지 말고 로드 오류를 발생시킨다. 오류에는 파일명,
몬스터 ID와 필드 경로를 포함한다.

권장 모듈 경계:

```text
monsterDesignLoader       JSON 파싱, 버전과 invalid 검사
monsterDesignValidator    ID, 참조, 자료형과 범위 검증
spawnMatcher              출현 조건과 난이도 판정
monsterStatResolver       층·난이도별 능력치 계산
conditionEvaluator        구조화된 조건 트리 평가
monsterBehaviorRuntime    phase, step, cooldown과 사용 이력 상태
triggerProcessor          이벤트, 우선순위와 반응 처리
monsterEffectDispatcher   effect_id별 실제 게임 handler
monsterIntentPresenter    Intent 표시 전용 변환
```

UI, Phaser 객체나 React 컴포넌트가 파서와 상태 머신의 핵심 로직에 직접 의존하지 않게
한다. 조건 평가와 행동 결정은 순수 함수 중심으로 작성한다.

## 6. 최소 TypeScript 타입

실제 JSON과 게임 규칙에 맞춰 확장하되 최소한 다음 경계를 둔다.

```ts
type Primitive = string | number | boolean | null;

type Condition =
  | {
      condition_id: string;
      operator: "eq" | "neq" | "lt" | "lte" | "gt" | "gte" | "contains" | "in";
      value: unknown;
    }
  | { all: Condition[] }
  | { any: Condition[] }
  | { not: Condition };

type Effect = {
  effect_id: string;
  order: number;
  parameters: Record<string, unknown>;
};

type Intent = {
  type: string;
  expected_damage?: number;
  hit_count?: number;
  icon_id?: string;
  reveal_description?: boolean;
};

type AbilityDefinition = {
  id: string;
  display_name: string;
  description?: string;
  effects: Effect[];
  intent?: Intent;
  tags?: string[];
  availability_condition?: Condition | null;
  cooldown_turns?: number;
};

type AbilityStep = {
  type: "ability";
  ability_id: string;
};

type RandomChoiceStep = {
  type: "random_choice";
  choices: Array<{
    ability_id: string;
    weight: number;
  }>;
};

type WaitStep = {
  type: "wait";
};

type PatternStep = AbilityStep | RandomChoiceStep | WaitStep;

type TriggerResponse =
  | {
      type: "transition_phase";
      target_phase_id: string;
      cancel_current_intent?: boolean;
      entry_timing?: "immediate" | "next_action";
    }
  | {
      type: "immediate" | "replace_intent" | "queue_next" | "append_action" | string;
      ability_id?: string;
      cancel_current_intent?: boolean;
    };

type TriggerDefinition = {
  id: string;
  event_id: string;
  condition?: Condition;
  priority?: number;
  once?: boolean;
  cooldown_turns?: number;
  max_triggers_per_turn?: number;
  max_triggers_per_battle?: number;
  allow_chained_triggers?: boolean;
  response: TriggerResponse;
};

type PhaseDefinition = {
  id: string;
  display_name: string;
  entry?: { ability_id: string };
  loop: {
    mode: "strict_sequence" | "random_loop" | string;
    fallback_ability_id: string;
    steps: PatternStep[];
  };
  triggers: TriggerDefinition[];
};

type MonsterDefinition = {
  id: string;
  display_name: string;
  grade_id: string;
  difficulty_tier: {
    min: number;
    max: number;
  };
  spawn_condition: Condition;
  stats: {
    max_hp: number;
    max_hp_by_floor?: Record<string, number>;
    [key: string]: unknown;
  };
  abilities: AbilityDefinition[];
  behavior: {
    initial_phase_id: string;
    phases: PhaseDefinition[];
  };
  tags?: string[];
  description?: string;
  image_resource_id?: string;
  invalid: boolean;
};

type BlockableMonsterDesign = {
  schema_version: string;
  invalid: boolean;
  metadata: Record<string, unknown>;
  monster_grades: Array<{ id: string; display_name: string }>;
  effect_definitions: Array<Record<string, unknown>>;
  condition_definitions: Array<Record<string, unknown>>;
  event_definitions: Array<Record<string, unknown>>;
  intent_definitions: Array<Record<string, unknown>>;
  trigger_response_definitions: Array<{
    id: string;
    display_name: string;
    target_kind: "ability" | "phase" | "none";
  }>;
  monsters: MonsterDefinition[];
};
```

`Primitive`만으로 모든 parameter를 제한하지 않는다. 효과와 조건 parameter에는 배열과
객체가 들어갈 수 있으므로 정의 schema에 따라 별도 검증한다.

## 7. 출현 판정

몬스터가 출현하려면 최소한 다음 두 조건을 모두 만족해야 한다.

1. 현재 던전 난이도 티어가 `difficulty_tier.min` 이상 `max` 이하
2. `spawn_condition` 트리가 현재 던전 컨텍스트에서 참

권장 컨텍스트:

```ts
type SpawnContext = {
  floor: number;
  dungeon_id?: string;
  node_type?: string;
  difficulty?: string;
  difficulty_tier: number;
  flags?: Set<string>;
};
```

`difficulty_tier`는 몬스터 등급이 아니다. `grade_id: normal/named/boss`와 혼합하거나
한쪽 값으로 다른 값을 추론하지 않는다.

조건 트리:

```text
{ all: [...] }  모든 하위 조건이 참
{ any: [...] }  하나 이상의 하위 조건이 참
{ not: {...} }  하위 조건 결과 반전
```

알 수 없는 `condition_id`나 operator는 거짓으로 조용히 처리하지 말고 개발 환경에서
명확한 오류를 발생시킨다.

## 8. 능력치 결정

필수 능력치는 `stats.max_hp`다. 1 이상의 유한 정수인지 확인한다.

현재 저장 파일의 13개 몬스터는 모두 `stats.max_hp`만 사용한다. 이전 예제에서
사용했던 `max_hp_by_floor`는 이 파일에 존재하지 않는다. 따라서 현재 파일을 적용할
때 층별 체력을 별도로 추측하거나 생성하지 않는다.

향후 `stats`에 새 필드가 추가될 수 있으므로 알 수 없는 능력치 필드를 파싱 단계에서
삭제하지 않는다. 게임이 지원하지 않는 필드는 경고 또는 명시적인 미지원 오류로
보고하고, 표시 이름이나 난이도 티어를 근거로 임의 보정하지 않는다.

## 9. 조건 평가

단일 조건은 `condition_id`, `operator`, `value`를 사용한다.

기본 operator:

| operator | 의미 |
|---|---|
| `eq` | 같음 |
| `neq` | 다름 |
| `lt` | 미만 |
| `lte` | 이하 |
| `gt` | 초과 |
| `gte` | 이상 |
| `contains` | 왼쪽 컬렉션이 오른쪽 값을 포함 |
| `in` | 왼쪽 값이 오른쪽 컬렉션에 포함 |

현재 저장 파일의 조건 정의:

| condition_id | 자료형 | 허용 operator | 현재 용도 |
|---|---|---|---|
| `floor` | integer, 최소 1 | `eq`, `lt`, `lte`, `gt`, `gte` | 모든 몬스터 출현 조건 |
| `dungeon_id` | string | `eq`, `neq` | 현재 미사용 |
| `difficulty` | string | `eq`, `neq`, `in` | 현재 미사용 |
| `monster_hp_ratio` | number, 0~1 | `lt`, `lte`, `gt`, `gte`, `eq` | 화염 구울 사망 시 반응 |
| `turn` | integer, 최소 1 | `eq`, `lt`, `lte`, `gt`, `gte` | 턴 기반 전환과 자폭 |

현재 파일에는 `player_hp_ratio`, `player_placed_block_id`,
`player_completed_combination_id` 정의가 없다. 다른 스키마 예시나 Designer의
향후 기본값을 근거로 현재 게임 파일에 존재한다고 가정하지 않는다.

HP 비율은 `0.0`부터 `1.0` 사이 값이다. `flame_ghoul`은
`monster_hp_ratio <= 0.0`일 때 즉시 `a0010` 시체 폭발을 실행한다. 사망 확정 전에
이 트리거를 평가할 수 있도록 `monster_hp_changed` 이벤트 순서를 설계해야 한다.

`condition_definitions`에 처음 보는 ID가 있으면 게임에 evaluator를 명시적으로
등록한다. 정의가 존재한다는 이유만으로 게임이 의미를 자동으로 이해할 수 있다고
가정하지 않는다.

## 10. 어빌리티와 Intent

어빌리티는 실행 가능한 행동이며 하나 이상의 효과를 가진다.

```json
{
  "id": "slime_fragment",
  "display_name": "점액 파편",
  "effects": [
    {
      "effect_id": "deal_damage",
      "order": 0,
      "parameters": {
        "target": "player",
        "target_mode": "single",
        "amount": 5
      }
    }
  ],
  "intent": {
    "type": "attack"
  }
}
```

효과는 `order` 오름차순으로 안정 정렬해 실행한다. `order`가 같으면 JSON 배열 순서를
유지한다. `order`는 수치가 아니며 실제 값은 `parameters`에서 읽는다.

Intent는 플레이어에게 다음 행동을 예고하기 위한 표시 정보다. Intent type을 보고
피해, 회복, 상태이상이나 자폭을 실행하지 않는다. 실제 동작은 항상 `effects`에서
결정한다.

어빌리티의 `availability_condition`이 거짓이면 패턴 후보에서 제외한다.
`cooldown_turns`가 남아 있어도 제외한다.

## 11. 효과 dispatch

게임은 지원하는 `effect_id`마다 handler를 명시적으로 등록한다.

현재 저장 파일의 효과 정의:

```text
deal_damage
heal
gain_block
apply_status
```

필수 parameter:

| effect_id | parameters |
|---|---|
| `deal_damage` | `target`, `amount >= 0` |
| `heal` | `target`, `amount >= 0` |
| `gain_block` | `target: self`, `amount >= 0` |
| `apply_status` | `target`, `status_id`, `stacks >= 1` |

대상 JSON의 `effect_definitions`를 읽고 게임 handler 지원 여부를 교차 검증한다.

알 수 없는 `effect_id`는 조용히 무시하지 않는다. 파일명, 몬스터 ID, 어빌리티 ID,
effect index와 ID를 포함한 오류를 발생시킨다.

### 대상 계약

대상 지정 효과는 `target`과 `target_mode`를 구분한다.

| target_mode | 의미 |
|---|---|
| 누락 또는 `single` | 해당 target 종류에서 한 대상 |
| `all` | 해당 target 종류의 모든 대상 |

`target`은 대상 진영 또는 종류이고 `target_mode`는 범위다. `all`을 별도의 target
종류로 해석하지 않는다. 단일 대상의 실제 선택 규칙은 게임 전투 시스템이 결정한다.

현재 저장 파일의 효과 62개에는 `target_mode`가 모두 생략돼 있다. 따라서 모두
`single`로 해석한다. 현재 파일만 보고 모든 효과가 항상 단일 대상이라고
하드코딩하지는 않는다.

### 자폭 계약

현재 파일에는 `self_destruct` Intent 정의가 있지만 `self_destruct` effect 정의는
없다. `explosive_soul.a0006` 자폭은 실제로 다음 두 효과로 표현돼 있다.

```json
[
  {
    "effect_id": "deal_damage",
    "order": 0,
    "parameters": {
      "target": "self",
      "amount": 100
    }
  },
  {
    "effect_id": "deal_damage",
    "order": 1,
    "parameters": {
      "target": "player",
      "amount": 50
    }
  }
]
```

따라서 현재 파일의 자폭은 두 `deal_damage`를 order 순서대로 실행한다. Intent
`self_destruct`를 근거로 별도의 숨은 자폭 handler를 추가하거나 사용자를 무조건
사망시키지 않는다. 자기 피해 100의 결과로 HP가 0 이하가 되면 일반 피해·사망
규칙으로 처리한다.

주의: 현재 `deal_damage` 정의의 `target.options`는 `player`만 허용하지만 자폭의 첫
효과는 `target: self`를 사용한다. 이는 저장 파일 내부의 정의와 사용 데이터가
불일치하는 지점이다. 게임 로더가 schema를 엄격히 적용하면
`explosive_soul.a0006.effects[0].parameters.target` 오류로 보고해야 한다. 임의로
`self`를 허용하거나 `player`로 바꾸지 말고, 게임 계약 또는 Designer 데이터에서
어느 쪽을 수정할지 사용자에게 확인한다.

### 상태 ID 주의사항

현재 `apply_status`에서 실제 사용한 상태 ID:

```text
burn
bleed
stun
injury
injry
weak
doubleAttack
```

`injury`와 `injry`는 현재 JSON에서 서로 다른 문자열이며 `doubleAttack`은 camelCase다.
파서가 오탈자 또는 명명 규칙 위반으로 추측해 자동 수정하지 않는다. 상태 정의는 이
파일 최상위에 없으므로 게임의 상태 레지스트리와 교차 검증한다. `injry`가 게임에
없다면 몬스터 ID와 어빌리티 ID를 포함한 명확한 데이터 오류로 보고하고 원본은
임의로 바꾸지 않는다.

## 12. 패턴 상태 머신

몬스터 인스턴스마다 최소한 다음 런타임 상태를 분리해 관리한다.

```ts
type MonsterBehaviorState = {
  phase_id: string;
  step_index_by_phase: Record<string, number>;
  queued_ability_id?: string;
  replacement_ability_id?: string;
  ability_cooldowns: Record<string, number>;
  ability_use_counts: Record<string, number>;
  recent_abilities: string[];
  trigger_counts: Record<string, number>;
  trigger_last_turn: Record<string, number>;
  fired_once_triggers: Set<string>;
};
```

행동 결정 순서:

1. 현재 이벤트와 일치하는 트리거를 수집한다.
2. 조건과 발동 제한을 검사한다.
3. priority 내림차순, JSON 배열 순서로 처리한다.
4. 페이즈 전환, Intent 교체와 예약 행동을 반영한다.
5. 행동 시점에 예약 또는 교체 행동이 있으면 먼저 사용한다.
6. 없으면 현재 페이즈의 pattern step을 평가한다.
7. availability, cooldown과 기타 제약으로 후보를 필터링한다.
8. 남은 후보 weight로 어빌리티를 선택한다.
9. 후보가 없으면 `fallback_ability_id`를 선택한다.
10. 효과를 `order` 순서로 실행한다.
11. cooldown, 사용 이력, 횟수와 step index를 갱신한다.

### Strict sequence

`steps`를 순서대로 실행하고 마지막 뒤에는 0번으로 돌아간다.

### Random choice

양수 weight 후보만 사용한다. weight 합은 100일 필요가 없다.

```text
80 + 20
8 + 2
```

두 경우 선택 확률은 같다. 사용할 수 없는 후보를 제거한 뒤 남은 weight로 다시
정규화한다. 후보가 없으면 fallback을 사용한다.

### Fallback

fallback은 패턴 후보를 선택하지 못했을 때 사용하는 예비 어빌리티다. 존재하는
어빌리티를 참조해야 한다. fallback도 사용할 수 없는 상황에 대한 게임 정책이 없다면
무한 재선택하지 말고 명시적인 오류 또는 대기 행동으로 처리한다.

현재 저장 파일의 행동 데이터 규모:

| 항목 | 개수 |
|---|---:|
| 어빌리티 | 39 |
| 효과 인스턴스 | 62 |
| 페이즈 | 22 |
| 패턴 step | 53 |
| 확정 어빌리티 step | 44 |
| random choice step | 9 |
| 트리거 | 11 |

현재 random choice weight 표는 `80/20`, `70/30`, `50/50`을 사용한다. 확률 합이
현재는 모두 100이지만 파서는 합계 100을 전제로 하지 않고 weight를 정규화한다.

## 13. 트리거 처리

현재 저장 파일의 이벤트 정의:

```text
battle_started
turn_started
monster_hp_changed
ability_used
```

JSON의 `event_definitions`는 이벤트 사전이고 실제 payload 발생 시점은 게임 이벤트
시스템과 일치시켜야 한다.

트리거 발동 제한:

- `once`
- `cooldown_turns`
- `max_triggers_per_turn`
- `max_triggers_per_battle`
- `allow_chained_triggers`

여러 트리거가 동시에 만족되면 priority가 높은 것부터 처리한다. priority가 같으면
원래 JSON 배열 순서를 유지한다.

기본 response:

| type | 처리 |
|---|---|
| `immediate` | 이벤트 처리 중 지정 어빌리티 실행 |
| `replace_intent` | 현재 예정 행동을 지정 어빌리티로 교체 |
| `queue_next` | 다음 행동으로 지정 어빌리티 예약 |
| `append_action` | 현재 행동 뒤 지정 어빌리티 추가 |
| `transition_phase` | `target_phase_id`로 전환 |

`trigger_response_definitions[].target_kind`에 따라 `ability_id`, `target_phase_id` 또는
대상 없음 중 필요한 필드를 판정한다. 사용자 정의 response ID가 있으면 게임 handler도
명시적으로 등록해야 한다.

즉시 반응 연쇄에는 깊이 또는 총 발동 횟수 제한을 둔다. 순환하는 즉시 트리거를
재귀로 무제한 실행하지 않는다.

현재 파일에는 트리거 11개가 있다.

- `transition_phase`: 9개
- `immediate`: 2개
- `turn_started` 사용: 9개
- `ability_used` 사용: 1개
- `monster_hp_changed` 사용: 1개

현재 모든 트리거의 `priority`는 0, `once`는 false, cooldown과 최대 발동 횟수는
0이며 `allow_chained_triggers`는 false다. 여기서 최대값 0은 제한 없음으로
해석한다.

`explosive_soul.destruct`는 3턴의 `ability_used` 이벤트에 즉시 `a0006`을 실행한다.
`a0006` 실행이 다시 `ability_used`를 발생시키더라도
`allow_chained_triggers: false`이므로 같은 연쇄에서 `destruct`를 다시 발동하지
않는다.

`explosive_soul.main_phase.steps[2]`도 직접 `a0006`을 사용한다. 따라서 3턴에 이
step이 실행되고 그 사용 이벤트가 `destruct` 조건을 만족하면 원래 행동 1회와 즉시
반응 1회로 `a0006`이 두 번 실행될 수 있다. 이를 중복 데이터라고 추측해 한쪽을
삭제하지 말고 JSON 순서와 트리거 계약대로 처리한다.

`flame_ghoul.explode`는 HP 비율 0 이하의 `monster_hp_changed` 이벤트에서 즉시
`a0010`을 실행한다. 게임은 몬스터 제거 전에 취소 가능한 HP 변경 반응을 처리할지,
사망 후 마지막 행동으로 처리할지 이벤트 계약을 명확히 해야 한다. 현재 JSON
자체에는 사망 취소 필드가 없다.

## 14. 페이즈 전환

초기 페이즈:

```text
monster.behavior.initial_phase_id
```

전환 처리:

1. 대상 페이즈가 존재하는지 확인한다.
2. `cancel_current_intent`를 반영한다.
3. 현재 phase ID를 변경한다.
4. JSON의 reset/keep 옵션에 따라 step index와 카운터를 처리한다.
5. 대상 페이즈의 `entry.ability_id`가 있으면 지정 timing에 실행한다.
6. 새 페이즈의 loop와 trigger 집합을 활성화한다.

전환 옵션이 JSON에 없는데 게임 계약도 확정되지 않았다면 임의로 모든 상태를
초기화하거나 유지하지 않는다. 명시적인 기본값을 문서와 테스트로 정한다.

서로 순환하는 즉시 전환과 무제한 trigger chain을 로더 또는 런타임 안전장치에서
차단한다.

## 15. 사용자 정의 항목

Designer에서는 다음 정의를 사용자가 추가하거나 편집할 수 있다.

```text
intent_definitions
event_definitions
trigger_response_definitions
```

따라서 게임은 알려진 표시 이름 목록을 하드코딩해서 파싱하지 않는다.

- 새로운 Intent: 표시 handler가 없으면 `unknown` 스타일 또는 개발 오류
- 새로운 event: 게임 event emitter와 payload adapter 필요
- 새로운 response: trigger response handler 필요

사용자 정의 항목의 `display_name`은 게임 로직의 dispatch 키가 아니다. 항상 ID를
사용한다.

## 16. 최소 로더 검증

게임 로더는 적어도 다음 항목을 검사한다.

- 지원하는 `schema_version`인가?
- 최상위 `invalid`가 `false`인가?
- 사용할 몬스터의 `invalid`가 `false`인가?
- 필수 최상위 배열과 `monsters`가 존재하는가?
- 각 이름 공간의 ID가 비어 있지 않고 중복되지 않는가?
- 모든 `grade_id`가 존재하는가?
- `difficulty_tier.min >= 1`이고 `max >= min`인가?
- `stats.max_hp >= 1`인가?
- spawn condition의 condition ID와 operator를 지원하는가?
- 모든 ability ID와 phase ID 참조가 존재하는가?
- 모든 effect ID가 정의되고 게임 handler가 지원하는가?
- 각 ability에 하나 이상의 effect가 있는가?
- effect parameter가 정의 schema의 자료형과 필수 조건을 만족하는가?
- 시작 페이즈가 존재하는가?
- 각 phase loop에 step과 fallback ability가 존재하는가?
- random choice에 후보와 양수 weight 합이 존재하는가?
- trigger event, condition과 response ID가 정의되어 있는가?
- trigger response 대상 ability 또는 phase가 존재하는가?
- 무제한 즉시 전환 순환이 없는가?

실패 시 다음 정보를 포함한다.

```text
파일 경로
monster ID
ability/phase/trigger ID
JSON 필드 경로
문제가 된 참조 또는 값
```

경고와 로딩 실패를 구분한다. Designer 경고만 있고 `invalid: false`인 파일은 게임
정책에 따라 허용할 수 있다.

## 17. 파서 구현 권장 순서

1. JSON 문법과 최상위 객체 확인
2. schema 및 invalid 검사
3. 공통 정의 배열 ID Map 생성
4. 몬스터 ID Map 생성
5. 몬스터별 ability/phase/trigger Map 생성
6. 모든 참조와 parameter schema 검증
7. spawn matcher 구현
8. stat resolver와 `max_hp` 검증 구현
9. condition evaluator 구현
10. effect dispatcher 구현
11. pattern selector와 fallback 구현
12. trigger processor 구현
13. phase transition 구현
14. Intent presenter 연결
15. 게임 전투 이벤트 시스템과 통합

각 단계는 UI나 Phaser 장면 없이 단위 테스트할 수 있게 작성한다.

## 18. 필수 테스트

### 로더

- 정상 `1.3.0` JSON 로드
- 잘못된 JSON과 미지원 schema 거부
- 최상위 또는 몬스터 `invalid: true` 거부
- 중복 ID와 끊어진 참조 거부
- 알 수 없는 effect/condition/event/response ID 보고

### 출현과 능력치

- floor 조건의 `all`, `any`, `not`
- difficulty tier 최소·최대 경계
- 현재 13개 몬스터의 `max_hp` 로드
- 정의되지 않은 능력치 보정을 임의로 추가하지 않음

### 어빌리티와 효과

- effect `order` 안정 정렬
- `target_mode` 누락 시 single
- single/all 대상 처리
- 자폭 `a0006`의 자기 피해 100 후 플레이어 피해 50 순서
- `deal_damage.target: self`와 정의 enum 불일치 보고
- `injury`, `injry`, `doubleAttack` 상태 ID를 자동 교정하지 않음
- 알 수 없는 effect handler 오류

### 패턴

- strict sequence 순환
- 고정 seed random choice
- availability와 cooldown 후보 제외
- 후보 재정규화
- fallback 실행

### 트리거와 페이즈

- 이벤트 불일치 시 미발동
- 조건 만족과 priority 순서
- once, cooldown, 턴당·전투당 제한
- replace/queue/append 반응
- phase transition과 entry ability
- 즉시 연쇄 깊이 제한

## 19. 완료 조건

다음이 모두 되면 게임 연동이 완료된 것이다.

1. `blockable_monster_design.json`을 게임 시작 또는 에셋 로드 단계에서 한 번 읽는다.
2. schema와 invalid 상태를 검사한다.
3. 공통 정의와 몬스터를 ID Map으로 조회할 수 있다.
4. 던전 컨텍스트로 출현 가능한 몬스터를 찾을 수 있다.
5. 현재 파일의 `stats.max_hp`를 올바르게 적용한다.
6. 어빌리티 효과를 order 순서대로 dispatch한다.
7. 누락된 target mode를 single로 처리하고 자폭의 두 피해 효과를 순서대로 처리한다.
8. strict/random 패턴, cooldown과 fallback을 실행한다.
9. 이벤트와 조건으로 트리거를 발동한다.
10. Intent 교체, 행동 예약, 추가 행동과 페이즈 전환을 처리한다.
11. Intent는 표시 전용으로 사용한다.
12. 알 수 없는 ID와 참조를 명확히 보고한다.
13. 수치와 패턴을 게임 코드에 중복 하드코딩하지 않는다.
14. 파서와 상태 머신의 관련 단위 테스트가 통과한다.

## 20. Monster Designer 수정 작업 지침

이 문서는 게임 파서 계약인 동시에 Designer를 수정하는 Codex의 필수 문서다.

Designer 수정 시:

1. `AGENTS.md`를 먼저 읽는다.
2. `docs/BLOCKABLE_MONSTER_DESIGNER_PLAN.md`와 이 문서를 읽는다.
3. 현재 파일 구조와 `git status --short`를 확인한다.
4. UI보다 domain, validation, persistence와 순수 서비스를 먼저 수정한다.
5. raw JSON 입력을 일반 사용자의 기본 편집 UI로 추가하지 않는다.
6. 알 수 없는 최신 필드와 기존 사용자 데이터를 조용히 삭제하지 않는다.
7. 오류가 있어도 저장을 허용하고 `invalid` 상태를 다시 계산한다.
8. 기능 변경 시 Semantic Versioning에 따라 프로그램 버전을 판단한다.
9. 기능 변경 내역을 루트 `CHANGELOG.md`에 간단히 기록한다.
10. 관련 테스트와 전체 `pytest`를 실행한다.
11. `git diff --check`를 실행한다.
12. 본 게임 저장소 수정, Git 커밋과 푸시는 별도 허가 없이 수행하지 않는다.

문서만 수정하고 기능 코드가 바뀌지 않았다면 사용자가 별도로 요청하지 않는 한
프로그램 버전을 올리지 않는다.

## 21. 완료 전 Codex 확인 목록

- [ ] 게임 저장소의 `AGENTS.md`와 필수 문서를 읽었는가?
- [ ] 적용 대상 JSON의 실제 schema, invalid와 ID를 확인했는가?
- [ ] 배열 개수와 ID를 코드에 하드코딩하지 않았는가?
- [ ] 표시 문자열이 아니라 ID와 parameters로 동작하는가?
- [ ] 출현 조건과 difficulty tier를 구분했는가?
- [ ] 층별 stats와 기본값 우선순위를 구현했는가?
- [ ] effect order, target mode와 자폭 계약을 구현했는가?
- [ ] strict/random 패턴과 fallback을 구현했는가?
- [ ] trigger 우선순위, 제한과 phase transition을 구현했는가?
- [ ] 즉시 반응 연쇄 제한이 있는가?
- [ ] invalid 데이터를 게임 런타임에서 거부하는가?
- [ ] 알 수 없는 사용자 정의 ID를 조용히 무시하지 않는가?
- [ ] 관련 테스트와 전체 테스트가 통과했는가?
- [ ] 원본 JSON과 다른 사용자 변경을 임의로 수정하지 않았는가?
- [ ] Designer 기능 변경 시 버전과 CHANGELOG를 갱신했는가?
- [ ] Git 커밋이나 푸시를 사용자 허가 없이 수행하지 않았는가?
