# Blockable Monster Designer → 본 게임 Codex 상호작용 지침

문서 버전: `1.0`  
대상 데이터: `blockable_monster_design.json`  
대상 프로그램: React + Phaser 기반 Blockable 본 게임

이 문서는 Monster Designer가 출력한 JSON을 Blockable 본 게임의 Codex에 전달하고,
몬스터 로더·등장 판정·스킬·행동 상태 머신을 구현할 때 따라야 할 데이터 계약이다.

---

## 1. 본 게임 Codex에 처음 전달할 명령문

아래 문장을 Monster Designer의 JSON과 이 문서와 함께 전달한다.

```text
이 작업은 Blockable Monster Designer에서 출력한 몬스터 JSON을 Blockable 본
게임에 적용하는 작업입니다.

먼저 본 게임 저장소 루트의 AGENTS.md와 필수 문서를 모두 읽으세요. 그 다음
BLOCKABLE_MONSTER_DESIGN_CODEX_INTERACTION_INSTRUCTION.md와 전달된
blockable_monster_design.json 전체를 읽으세요.

문서에 적힌 예시 수치보다 전달된 JSON의 실제 schema_version, ID, 배열과 값을
우선하세요. 단, JSON이 이 지침의 스키마와 다르면 임의로 추측하지 말고 차이를
보고하세요.

몬스터는 hp만 고정 능력치로 가집니다. 기본 공격을 포함한 모든 행동은 skills[]의
일반 스킬이며 실제 결과는 공통 effects[]로 실행합니다. appearance_condition[]은
OR 조건이고 각 항목 안의 던전과 층 조건은 AND입니다.

behavior.initial_phase_id와 phases[]를 상태 머신으로 구현하세요. 현재 반복 모드는
STRICT_SEQUENCE이며 step은 SKILL 또는 RANDOM_CHOICE입니다. 현재 페이즈의
triggers[]만 이벤트별로 평가하고 priority, once, cooldown과 횟수 제한을
보존하세요.

표시 이름이나 description을 실행 키로 사용하지 마세요. 모든 참조는 ID로
해결하고, 중복 ID·알 수 없는 참조·지원하지 않는 effect type·invalid 데이터를
조용히 무시하지 말고 필드 경로가 포함된 오류로 보고하세요.

몬스터 수치나 패턴을 게임 코드에 중복 하드코딩하지 마세요. 로더·검증기·등장
판정·행동 상태 머신·효과 dispatch를 분리하고 관련 단위 테스트와 전체 테스트를
실행한 뒤 결과를 보고하세요.

Git 커밋과 푸시는 별도 허가 없이는 수행하지 마세요.
```

---

## 2. 전달 세트

Monster Designer에서 본 게임으로 전달할 파일은 다음 두 개다.

```text
blockable_monster_design.json
BLOCKABLE_MONSTER_DESIGN_CODEX_INTERACTION_INSTRUCTION.md
```

권장 본 게임 저장 위치:

```text
docs/references/designs/blockable_monster_design.json
docs/references/designs/BLOCKABLE_MONSTER_DESIGN_CODEX_INTERACTION_INSTRUCTION.md
```

대상 저장소의 `AGENTS.md`가 다른 경로를 지정하면 그 지침을 따른다.

---

## 3. 우선순위

적용 시 우선순위는 다음과 같다.

1. 본 게임 저장소의 `AGENTS.md`
2. 전달된 `blockable_monster_design.json`
3. 이 상호작용 지침
4. Designer 기획안의 예시

JSON과 이 문서의 실제 ID·수치·개수가 다르면 JSON을 기준으로 다시 집계한다.
하지만 JSON 구조나 의미가 이 문서와 충돌하면 자동 보정하지 않고 사용자에게
불일치를 보고한다.

---

## 4. 파일과 버전 계약

최상위 구조:

```json
{
  "schema_version": "1.0.0",
  "data_type": "blockable_monster_design",
  "metadata": {
    "project_name": "Blockable",
    "designer_name": "Blockable Monster Designer",
    "updated_at": "2026-07-29T00:00:00+09:00",
    "validation_status": "valid"
  },
  "monsters": []
}
```

본 게임 로더는 다음을 먼저 검사한다.

1. JSON 파싱 성공
2. `schema_version` 지원 여부
3. `data_type === "blockable_monster_design"`
4. `metadata.validation_status !== "invalid"`
5. `monsters`가 배열인지 여부

지원하지 않는 상위 스키마를 부분적으로 추측해 실행하지 않는다.

---

## 5. 핵심 실행 원칙

### 5.1 몬스터의 고정 능력치는 HP만 존재

```text
monster.hp
→ 최대 HP

runtime.currentHp
→ 현재 HP
```

공격력, 방어력 또는 기타 `stats`를 생성하거나 기본값으로 보충하지 않는다.
몬스터의 공격·방어·회복 수치는 스킬 효과에서 읽는다.

### 5.2 기본 공격도 일반 스킬

```text
skills[]
├─ basic_attack
├─ 특수 공격
├─ 회복
└─ 버프·디버프 행동
```

`basic_attack`이라는 ID는 권장 기본값일 뿐 별도 런타임 클래스를 의미하지 않는다.
패턴은 모든 행동을 동일하게 `skill_id`로 참조한다.

### 5.3 공통 효과 사용

스킬의 실제 결과는 모두 다음 공통 구조로 표현한다.

```text
effect_id
effect_name
description
target
value
type
parameters
├─ id
├─ duration
└─ intensify
```

본 게임은 `effect_name` 또는 `description`이 아니라 `type`과
`parameters.id`를 dispatch 키로 사용한다.

---

## 6. ID와 표시 문자열

실행과 참조에 사용하는 필드:

```text
monster_id
skill_id
effect_id
phase_id
trigger_id
dungeon_id
type
parameters.id
event_id
condition_id
response.type
```

표시 전용 필드:

```text
monster_name
skill_name
effect_name
phase_name
description
```

ID 이름 공간:

- `monster_id`: 프로젝트 전체에서 고유
- `skill_id`: 해당 몬스터 안에서 고유
- `effect_id`: 해당 스킬 안에서 고유
- `phase_id`: 해당 몬스터 안에서 고유
- `trigger_id`: 해당 몬스터의 행동 범위에서 고유

중복 ID를 마지막 값으로 덮어쓰지 않는다.

---

## 7. 권장 로더 모듈

```text
monsterDesignLoader
→ JSON 파싱, 버전과 data_type 검사

monsterDesignValidator
→ 자료형, 범위, 중복 ID와 참조 검사

monsterAppearanceMatcher
→ 던전·층 등장 조건 판정

monsterRuntimeFactory
→ 최대 HP와 행동 런타임 초기화

monsterBehaviorRuntime
→ 현재 페이즈, 단계 위치, 쿨다운과 실행 이력 관리

monsterTriggerProcessor
→ 이벤트별 트리거 후보 평가와 반응 실행

monsterEffectDispatcher
→ 공통 type과 parameters.id별 실제 효과 실행
```

React 컴포넌트와 Phaser 객체가 JSON 파서나 상태 머신 내부 규칙을 직접 소유하지
않게 한다.

---

## 8. 최소 TypeScript 경계

실제 프로젝트 타입 체계에 맞게 이름은 조정할 수 있지만 데이터 의미는 보존한다.

```ts
type MonsterGrade = "NORMAL" | "VETERAN" | "ELITE" | "BOSS";

type ValidationStatus = "valid" | "warning" | "invalid";

type AppearanceCondition = {
  dungeon_id: string;
  floor_min: number;
  floor_max: number;
};

type EffectParameters = {
  id: string;
  duration: number;
  intensify: number;
};

type EffectDefinition = {
  effect_id: string;
  effect_name: string;
  description: string;
  target: string;
  value: number;
  type: string;
  parameters: EffectParameters;
};

type SkillDefinition = {
  skill_id: string;
  skill_name: string;
  description: string;
  effects: EffectDefinition[];
};

type SkillStep = {
  type: "SKILL";
  skill_id: string;
};

type RandomChoiceStep = {
  type: "RANDOM_CHOICE";
  choices: Array<{
    skill_id: string;
    weight: number;
  }>;
};

type PatternStep = SkillStep | RandomChoiceStep;

type PhaseLoop = {
  mode: "STRICT_SEQUENCE";
  fallback_skill_id: string;
  steps: PatternStep[];
};

type TriggerCondition = {
  condition_id: string;
  operator: "EQ" | "NEQ" | "LT" | "LTE" | "GT" | "GTE";
  value: unknown;
};

type ImmediateResponse = {
  type: "IMMEDIATE";
  cancel_current_intent: boolean;
  skill_id: string;
};

type TransitionPhaseResponse = {
  type: "TRANSITION_PHASE";
  cancel_current_intent: boolean;
  target_phase_id: string;
};

type TriggerResponse = ImmediateResponse | TransitionPhaseResponse;

type TriggerDefinition = {
  trigger_id: string;
  event_id: "TURN_STARTED" | "MONSTER_HP_CHANGED" | "SKILL_USED";
  condition: TriggerCondition | null;
  priority: number;
  once: boolean;
  cooldown_turns: number;
  max_triggers_per_turn: number;
  max_triggers_per_battle: number;
  allow_chained_triggers: boolean;
  response: TriggerResponse;
};

type PhaseDefinition = {
  phase_id: string;
  phase_name: string;
  loop: PhaseLoop;
  triggers: TriggerDefinition[];
};

type MonsterBehavior = {
  initial_phase_id: string;
  phases: PhaseDefinition[];
};

type MonsterDefinition = {
  monster_id: string;
  monster_name: string;
  description: string;
  grade: MonsterGrade;
  appearance_condition: AppearanceCondition[];
  hp: number;
  skills: SkillDefinition[];
  behavior: MonsterBehavior;
};
```

문서의 유니온 타입을 그대로 복사하는 것보다 실제 JSON을 검증하는 런타임 스키마를
함께 두는 것을 권장한다.

---

## 9. 인덱싱

최상위 로드 후:

```ts
type MonsterDesignIndexes = {
  monsterById: Map<string, MonsterDefinition>;
};
```

전투에 몬스터를 생성할 때:

```ts
type MonsterRuntimeIndexes = {
  skillById: Map<string, SkillDefinition>;
  phaseById: Map<string, PhaseDefinition>;
  triggerById: Map<string, TriggerDefinition>;
};
```

Map을 만들기 전에 중복을 검사한다. 알 수 없는 참조는 `undefined`로 흘려보내거나
fallback으로 감추지 않는다.

오류 예:

```text
blockable_monster_design.json
monsters[2].behavior.phases[1].loop.steps[0].skill_id
unknown skill_id: flame_breath
```

---

## 10. 등장 판정

`appearance_condition[]`은 OR 목록이다. 각 항목의 던전과 층 조건은 AND다.

```ts
function canAppear(
  monster: MonsterDefinition,
  dungeonId: string,
  floor: number,
): boolean {
  return monster.appearance_condition.some((condition) => {
    const dungeonMatches =
      condition.dungeon_id === "all" ||
      condition.dungeon_id === dungeonId;

    const floorMatches =
      floor >= condition.floor_min &&
      floor <= condition.floor_max;

    return dungeonMatches && floorMatches;
  });
}
```

규칙:

- `"all"`은 모든 던전에 일치한다.
- 던전 ID는 대소문자를 포함해 정확히 비교한다.
- 층 범위는 양 끝을 포함한다.
- `appearance_condition[]`이 비어 있으면 등장 불가가 아니라 데이터 오류다.
- 등급으로 등장 조건을 자동 추가하지 않는다.

등장 가능 판정은 실제 인카운터 선택과 다르다. 후보 중 어떤 몬스터를 배치할지는
본 게임의 맵·노드 규칙이 결정한다.

---

## 11. 몬스터 런타임 초기화

```text
definition.hp
→ maxHp
→ currentHp

definition.behavior.initial_phase_id
→ currentPhaseId

초기 stepIndex
→ 0
```

최소 런타임 상태:

```ts
type MonsterBehaviorState = {
  current_phase_id: string;
  step_index: number;
  skill_cooldowns: Map<string, number>;
  trigger_cooldowns: Map<string, number>;
  trigger_counts_this_turn: Map<string, number>;
  trigger_counts_this_battle: Map<string, number>;
  fired_once: Set<string>;
};
```

스킬 쿨다운은 현재 데이터에 정식 필드가 없으므로 기본 `0`으로만 유지하거나,
실제 필드가 추가될 때까지 구현하지 않는다.

---

## 12. 스킬 실행

스킬 실행 순서:

```text
1. skill_id로 스킬 조회
2. 실행 가능한 대상 기준점 결정
3. effects[] 배열 순서를 보존해 읽기
4. 공통 효과 파싱 계약에 따라 공격·상태·자원 효과 분류
5. 공통 전투 공식으로 실제 효과 실행
6. SKILL_USED 이벤트 발행
7. 해당 이벤트의 현재 페이즈 트리거 검사
```

몬스터의 공격력을 별도로 더하지 않는다. 예:

```json
{
  "type": "BASE_DAMAGE",
  "value": 5
}
```

이 스킬의 기초 피해는 `5`에서 시작한다.

---

## 13. 공통 효과 계약

### 13.1 대상

```text
SELECTED
self
L1, L2, L3 ...
R1, R2, R3 ...
B1, B2, B3 ...
all
```

- `self`: 스킬을 사용하는 몬스터
- `SELECTED`: 행동 선택기가 지정한 기준 상대
- `Lx`, `Rx`, `Bx`: 기준 대상을 포함한 위치 범위
- `all`: 해당 효과가 허용한 대상 전체

다수 몬스터·다수 플레이어 전투에서 정확한 진영 규칙이 본 게임에 아직 없다면
추측해서 넓히지 않는다. 현재 게임 구조와 사용자 확인을 기준으로 구현한다.

### 13.2 허용 타입

```text
BASE_DAMAGE
BASE_HIT_COUNT
INDEPENDENT_DAMAGE
BLOCK
RECOVERY
STATUS_DAMAGE
DEBUFF
CROWD_CONTROL
BUFF
EXTRA_TURN
DECK_CAPACITY
DRAW
PLACEMENT_COUNT
```

알 수 없는 `type` 또는 `parameters.id`는 조용히 무시하지 않는다.

### 13.3 전투 변수 연결

```text
BASE_DAMAGE                     → B
BASE_HIT_COUNT.value            → 연속 공격 1타의 B
BASE_HIT_COUNT.intensify        → H
INDEPENDENT_DAMAGE              → A
BUFF + DAMAGE_BONUS             → S → 이후 P
BUFF + HIT_COUNT                → S → 이후 H
BUFF + ATTACK_MULTIPLIER        → S → 이후 M
DEBUFF + ATTACK_REDUCTION       → C → 이후 D
DEBUFF + DAMAGE_TAKEN_INCREASE  → C → 이후 W
STATUS_DAMAGE / CROWD_CONTROL   → C → 전용 처리기
```

`S`와 `C`는 숫자가 아니라 상태 갱신 목록이다.

### 13.4 `BASE_HIT_COUNT`

```text
value                 = 1회당 기본 피해량
parameters.intensify  = 이번 행동의 연속 공격 횟수
parameters.id         = CURRENT_ACTION
parameters.duration   = 0
```

```text
최종 H
= BASE_HIT_COUNT.parameters.intensify
 + 이미 적용 중인 BUFF + HIT_COUNT 증감치
```

여러 `BASE_HIT_COUNT` 효과는 각자의 `target`, `value`, `intensify`를 가진
별도 연속 공격으로 처리한다. 합쳐서 하나의 피해량 또는 횟수로 만들지 않는다.

`BASE_HIT_COUNT`는 이번 행동의 공격이고 런타임 상태에 저장하지 않는다.
`BUFF + HIT_COUNT`는 공격 후 `S`에 등록되어 이후 행동부터 적용된다.

### 13.5 효과 파싱 순서

```text
1. BASE_DAMAGE를 모아 일반 기본 공격의 B 계산
2. 공격자의 기존 BUFF에서 P, H 증감치와 M 계산
3. 각 BASE_HIT_COUNT를 별도 연속 공격으로 등록
4. 공격자의 기존 DEBUFF에서 D 계산
5. 기본 공격을 실행하고 실제 대상마다 W 계산
6. INDEPENDENT_DAMAGE를 각각 별도 실행하고 대상마다 W 계산
7. BUFF를 S에 등록
8. DEBUFF, STATUS_DAMAGE, CROWD_CONTROL을 C에 등록
9. S와 C를 런타임 상태에 반영
10. EXTRA_TURN과 자원 관련 효과 처리
11. 턴 종료 시 STATUS_DAMAGE를 parameters.id별 규칙으로 실행
```

Monster Designer는 배열 순서를 보존하지만, 본 게임의 공통 전투 효과 표준이
더 구체적인 단계 순서를 정의하면 그 표준을 따른다.

---

## 14. 행동 상태 머신

### 14.1 시작

```text
currentPhaseId = behavior.initial_phase_id
stepIndex = 0
```

### 14.2 `STRICT_SEQUENCE`

```text
현재 phase.loop.steps[stepIndex] 선택
→ 단계에서 skill_id 결정
→ 스킬 실행
→ stepIndex 증가
→ 끝에 도달하면 0으로 순환
```

### 14.3 `SKILL` 단계

```json
{
  "type": "SKILL",
  "skill_id": "basic_attack"
}
```

참조가 존재하지 않으면 로드 오류다. fallback으로 숨기지 않는다.

### 14.4 `RANDOM_CHOICE` 단계

```json
{
  "type": "RANDOM_CHOICE",
  "choices": [
    {
      "skill_id": "slime_fragment",
      "weight": 80
    },
    {
      "skill_id": "self_recovery",
      "weight": 20
    }
  ]
}
```

선택 절차:

1. 실행 가능한 후보를 필터링한다.
2. 남은 후보의 양수 `weight` 합을 구한다.
3. 누적 가중치로 하나를 추첨한다.
4. 후보가 없으면 `fallback_skill_id`를 실행한다.

현재 스키마에는 스킬 사용 가능 조건이 없으므로 정상 데이터에서는 모든 참조
스킬이 실행 가능하다. 향후 조건이 추가되기 전까지 임의 제약을 만들지 않는다.

### 14.5 Fallback

fallback은 유효한 데이터가 런타임 상태 때문에 선택 불가능할 때 사용한다.

다음은 fallback 대상이 아니다.

- 존재하지 않는 `skill_id`
- 빈 `choices`
- 0 이하 weight
- 잘못된 step type

이 항목들은 로더 오류다.

---

## 15. 트리거 처리

### 15.1 기본 처리 순서

```text
1. 전투 이벤트 발생
2. 현재 페이즈의 triggers[]만 조회
3. event_id 일치 후보 선택
4. condition 평가
5. once, cooldown과 실행 횟수 제한 검사
6. priority 내림차순 정렬
7. 같은 priority는 JSON 배열 순서 유지
8. response 실행
9. 실행 이력과 cooldown 갱신
```

### 15.2 실행 제한

```text
once
→ 전투 중 1회만 실행

cooldown_turns
→ 실행 후 다시 활성화되기까지의 턴 수

max_triggers_per_turn
→ 0이면 제한 없음, 1 이상이면 턴당 제한

max_triggers_per_battle
→ 0이면 제한 없음, 1 이상이면 전투당 제한
```

### 15.3 연쇄 트리거

`allow_chained_triggers: false`인 트리거의 반응이 새 이벤트를 발생시켜도 같은
이벤트 처리 체인에서 추가 트리거를 실행하지 않는다.

연쇄를 허용할 때도 무한 루프를 막기 위한 전투 엔진의 최대 체인 깊이를 둔다.
그 값은 Designer 데이터가 아니라 본 게임 안전장치다.

### 15.4 즉시 실행

```text
response.type = IMMEDIATE
→ response.skill_id 조회
→ cancel_current_intent 처리
→ 스킬을 즉시 행동 대기열에 등록
```

동일 이벤트 처리 중 정확히 어느 위치에 삽입하는지는 본 게임의 전투 이벤트
큐 규칙과 일치시킨다.

### 15.5 페이즈 전환

```text
response.type = TRANSITION_PHASE
→ target_phase_id 검증
→ currentPhaseId 변경
→ stepIndex = 0
→ 새 페이즈의 반복 패턴을 다음 행동부터 사용
```

페이즈 전환은 몬스터 HP를 회복하거나 상태를 초기화하지 않는다. 그런 결과가
필요하면 별도 스킬 효과로 명시해야 한다.

---

## 16. 최소 로더 검증

### 16.1 파일

- 지원하는 `schema_version`
- 올바른 `data_type`
- `validation_status !== "invalid"`
- `monsters` 배열 존재

### 16.2 기본 정보

- 중복 없는 `monster_id`
- 지원하는 네 등급
- `hp`가 1 이상의 정수
- 하나 이상의 등장 조건
- `"all"`과 특정 던전 조건 미혼용
- 유효한 층 범위

### 16.3 스킬·효과

- 몬스터 내부에서 고유한 `skill_id`
- 비어 있지 않은 `effects[]`
- 공통 효과 필수 필드
- 지원하는 `target`, `type`, `parameters.id`
- 정수 `value`, `duration`, `intensify`
- `BASE_HIT_COUNT`의 `CURRENT_ACTION / 0 / intensify >= 1`

### 16.4 행동

- 존재하는 `initial_phase_id`
- 중복 없는 `phase_id`
- 지원하는 `loop.mode`
- 비어 있지 않은 `steps[]`
- 모든 step·choice·fallback의 유효한 스킬 참조
- 양수 weight
- 중복 없는 `trigger_id`
- 지원하는 이벤트·조건·연산자·반응
- 즉시 실행 스킬과 전환 페이즈 참조 유효성
- 0 이상의 쿨다운과 실행 횟수 제한

---

## 17. 오류 처리

다음 방식은 금지한다.

- 알 수 없는 효과를 건너뛰기
- 없는 스킬을 기본 공격으로 자동 치환
- 없는 페이즈를 시작 페이즈로 자동 치환
- 음수 weight를 0으로 보정
- `named`를 자동으로 `VETERAN` 또는 `ELITE`로 변환
- 설명 문자열에서 수치나 상태 ID 추출
- 몬스터 등급으로 HP나 공격력 자동 보정

개발 빌드에서는 경로가 포함된 명확한 오류를 발생시킨다. 배포 빌드에서 파일 전체를
거부할지 해당 몬스터만 제외할지는 본 게임의 콘텐츠 로딩 정책으로 명시적으로
결정하되, 조용히 정상 데이터처럼 취급하지 않는다.

---

## 18. 기존 JSON과 신규 스키마

기존 첨부 JSON은 행동 패턴 개념의 참고 자료다. 신규 JSON과 자동 호환되는
최종 계약이 아니다.

주요 변환:

```text
abilities[]         → skills[]
ability_id          → skill_id
stats.max_hp        → hp
spawn_condition     → appearance_condition[]
strict_sequence     → STRICT_SEQUENCE
ability step        → SKILL step
random_choice       → RANDOM_CHOICE
ability_used        → SKILL_USED
immediate           → IMMEDIATE
transition_phase    → TRANSITION_PHASE
```

특히 다음은 자동 추측하지 않는다.

- 기존 `named`가 `VETERAN`인지 `ELITE`인지
- 기존 복합 `spawn_condition`을 어떤 던전별 층 범위로 바꿀지
- 기존 `effect_id + parameters`를 어떤 공통 효과 `type`으로 바꿀지

본 게임은 Designer에서 신규 스키마로 내보낸 파일을 받는 것을 기본으로 한다.

---

## 19. 권장 구현 순서

1. 최상위 파일·버전 검사
2. Monster 런타임 스키마 검증
3. 몬스터·스킬·페이즈·트리거 ID 인덱싱
4. 등장 조건 판정
5. HP 런타임 생성
6. 공통 효과 dispatch 연결
7. 순차·확률 단계 선택기
8. 트리거 처리
9. 페이즈 전환
10. React/Phaser 표시 계층 연결
11. 통합 테스트

효과 dispatch가 준비되지 않은 상태에서 행동 상태 머신이 완성된 것처럼 처리하지
않는다. 스킬 선택과 실제 스킬 결과 실행은 모두 연결되어야 한다.

---

## 20. 필수 테스트

### 20.1 로더

- 정상 JSON 로드
- 지원하지 않는 버전 거부
- 잘못된 `data_type` 거부
- `invalid` 파일 거부
- 중복 ID와 알 수 없는 참조 거부

### 20.2 등장

- 특정 던전과 층 범위 일치
- 다른 던전 불일치
- `"all"` 일치
- 여러 조건 중 하나 일치
- 범위 양 끝 포함

### 20.3 스킬과 효과

- 기본 공격을 일반 스킬로 실행
- 여러 효과 순서 보존
- 몬스터 공격력 능력치를 추가하지 않음
- 연속 공격의 `value`와 `intensify` 보존
- 여러 연속 공격을 합치지 않음
- `S`, `C` 상태 갱신 시점

### 20.4 패턴

- `STRICT_SEQUENCE` 순환
- `SKILL` 단계
- 가중치 기반 `RANDOM_CHOICE`
- 후보 없음 시 fallback
- 데이터 오류를 fallback으로 숨기지 않음

### 20.5 트리거와 페이즈

- 현재 페이즈 트리거만 평가
- 이벤트·조건 필터
- priority와 안정 정렬
- once·쿨다운·횟수 제한
- 즉시 스킬 실행
- 페이즈 전환과 stepIndex 초기화
- 연쇄 트리거 차단과 최대 깊이

---

## 21. 완료 조건

본 게임 적용은 다음을 모두 만족해야 완료다.

1. JSON이 단일 데이터 원본이다.
2. 몬스터는 HP만 고정 능력치로 사용한다.
3. 기본 공격을 포함한 모든 행동을 `skills[]`로 실행한다.
4. 모든 스킬 결과를 공통 효과 구조로 dispatch한다.
5. 여러 등장 조건과 `"all"`을 정확히 판정한다.
6. 시작 페이즈와 현재 페이즈 상태를 관리한다.
7. 순차 단계와 확률 선택을 처리한다.
8. 트리거 우선순위·제한·반응을 처리한다.
9. 페이즈 전환 시 단계 위치를 초기화한다.
10. 알 수 없는 값이나 참조를 조용히 무시하지 않는다.
11. 로더, 등장, 효과, 패턴과 트리거 테스트가 통과한다.
12. 변경 파일과 테스트 결과를 사용자에게 보고한다.
13. 별도 허가 없이 Git 커밋·푸시하지 않는다.

---

## 22. 새 JSON 재발행 시 갱신 절차

Monster Designer 또는 본 게임의 실제 구현을 기준으로 JSON을 다시 발행할 때:

1. 새 JSON 전체를 파싱한다.
2. `schema_version`, 검증 상태와 최상위 구조를 확인한다.
3. 몬스터·등급·스킬·효과·페이즈·트리거의 실제 ID와 개수를 다시 집계한다.
4. 모든 참조와 공통 효과 매개변수를 검증한다.
5. 본 문서의 구조·허용 값·파싱 순서가 새 JSON과 일치하는지 확인한다.
6. 이전 스냅샷에만 있던 수치와 ID를 제거한다.
7. 새 JSON과 갱신된 이 문서를 하나의 전달 세트로 본 게임 Codex에 넘긴다.

새 JSON 발행 전에는 이 문서를 근거로 기존 JSON의 수치나 구조를 임의 변환하지
않는다.
