# Blockable Codex 개발 지침 v0.4

## 문서 목적

이 문서는 **Blockable을 어떤 구조와 원칙으로 구현할 것인지**를 정의한다.

현재 해커톤 프로토타입에는 마감 대응을 위해 일부 임시 구현, 국소 하드코딩, 구조적 타협이 존재할 수 있다. 이 문서는 그러한 임시 코드를 그대로 정당화하거나 현재 Repository를 1:1 설명하기 위한 문서가 아니다.

이 문서는 다음 두 역할을 가진다.

1. 현재 기능을 수정할 때 Codex가 따라야 할 최소 변경 원칙
2. 해커톤 이후 정식 정리·리팩터링 시 목표로 삼을 Target Architecture

게임 규칙은 다음 문서가 Source of Truth다.

- `BLOCKABLE_GAME_DESIGN.md`: 무엇을 플레이하는 게임인가
- `BLOCKABLE_COMBAT_SYSTEM.md`: 전투가 어떻게 계산되는가
- `BLOCKABLE_MAP_SYSTEM.md`: 지도가 어떻게 생성·이동·저장되는가

이 문서는 게임 규칙을 새로 만들지 않는다.

---

# 1. 프로젝트 기본 환경

## 1.1 플랫폼

- Web
- Browser-based Single Player Game
- Static Web Deployment
- GitHub Pages와 같은 정적 호스팅을 기본 배포 방식으로 고려한다.

## 1.2 현재 핵심 기술

현재 프로젝트의 중심 구조는 다음과 같다.

- React: 화면과 DOM UI
- Phaser: 전투의 동적 Game Board와 Canvas 입력·연출
- JSON 기반 Block / Monster / Combination Data
- Browser Storage 기반 Run Save
- Vite 계열 정적 빌드 환경

특정 Library를 문서에 적었다는 이유만으로 새 의존성을 강제로 추가하지 않는다.

예를 들어 Zustand, XState, Howler.js, Motion for React 등의 사용 여부는 실제 Repository와 현재 구조를 먼저 확인한 뒤 판단한다.

현재 사용하지 않는 Library를 이 문서를 맞추기 위해 새로 도입하지 않는다.

---

# 2. 가장 중요한 구현 원칙

## 2.1 단일 책임

> 메인 파일 하나 또는 하나의 Phaser Scene에 모든 기능을 작성하지 않는다.

- Screen은 화면 조립을 담당한다.
- Game Rule은 별도 System/Engine 계층이 담당한다.
- Data는 Data Layer가 담당한다.
- Presentation은 React 또는 Phaser가 담당한다.
- Save는 저장 계층이 담당한다.

## 2.2 단일 Source of Truth

같은 상태를 여러 기술 계층이 각각 원본처럼 소유하지 않는다.

예:

- Player HP를 React state와 Phaser 내부 변수에서 각각 계산하지 않는다.
- Monster Planned Ability를 UI와 Combat Logic이 각각 Random으로 결정하지 않는다.
- Map Node 완료 여부를 React와 Map Engine이 별도로 수정하지 않는다.

하나의 도메인 상태는 하나의 Source of Truth를 가진다.

## 2.3 Presentation은 Rule을 복제하지 않는다

UI는 게임 결과를 표시한다.

UI가 다음과 같은 핵심 규칙을 별도로 다시 계산하지 않는다.

- Damage
- Armor
- Status 수명
- Monster Ability 선택
- Map 이동 가능 여부
- Blueprint Discovery 판정
- Shop Transaction Count

가능하면 Engine/System에서 결과를 생성하고 Presentation은 그 결과를 표시한다.

---

# 3. Target Architecture

장기적으로 다음 흐름을 목표로 한다.

```text
User Input / UI
        ↓
Command / Event
        ↓
Game Engine / State
        ↓
Game Result / Presentation State
        ↓
React / Phaser Presentation
```

예:

```text
[Turn End 클릭]
      ↓
END_TURN Command
      ↓
Combat Engine
- Combination 계산
- Damage 계산
- Status 계산
- Monster Planned Action 실행
      ↓
Result
- HP Changed
- Status Changed
- Monster Action
- Damage Presentation
      ↓
React / Phaser
```

현재 프로토타입 전체가 이 구조로 완전히 분리되어 있다고 가정하지 않는다.

새 작업에서 불필요한 대규모 리팩터링 없이 이 방향으로 책임을 분리한다.

---

# 4. React와 Phaser의 역할

현재 Blockable은 **React와 Phaser를 한 화면에서 역할 분리하여 사용**한다.

핵심 원칙:

> Static / DOM Presentation과 Dynamic Game Board를 중복 소유하지 않는다.

## 4.1 React가 담당하는 영역

현재 구조에서 React가 담당하기 적합한 영역:

- Splash / Main / Prologue
- World Map Screen
- Dungeon Map UI
- Event
- Shop
- Rest
- Reward
- Result / Victory / GameOver
- Common Game Menu
- Player HP / Armor / Status HUD
- Blueprint Panel
- Monster List / Monster Detail
- Monster HP / Status / Intent Text
- Modal / Tooltip
- Settings
- 접근성 중심 UI

React UI는 CSS Grid / Flexbox / Container-relative Layout을 우선 사용한다.

## 4.2 Phaser가 담당하는 영역

현재 Battle에서 Phaser가 담당하기 적합한 동적 영역:

- Formwork / Puzzle Board
- Drag 가능한 Block
- Block Rotation
- Block Placement / Recall
- Placement Ghost
- Canvas Pointer Input
- Board의 Dynamic Highlight
- Battle Dynamic Effect Text
- Damage Number
- Canvas 기반 Hit / Attack Presentation
- Phaser Tween / Animation이 필요한 동적 연출

## 4.3 중복 렌더링 금지

금지 예:

- 같은 Block을 React와 Phaser에서 동시에 실제 게임 오브젝트로 생성
- 같은 Monster HP를 React와 Phaser에서 각각 계산
- Phaser Scene에서 DOM Element를 직접 찾아 수정
- React Component가 Phaser Sprite 내부 속성을 직접 임의 변경

필요한 연결은 명시적인 Event / Bridge를 이용한다.

## 4.4 Monster Presentation

과거 지침처럼 "Monster는 무조건 Phaser가 렌더링해야 한다"고 절대 규칙으로 두지 않는다.

현재 Blockable에서는 Monster의 정보 UI와 Static Presentation을 React가 담당할 수 있다.

중요한 것은 기술 선택이 아니라 **한 요소의 소유권을 한쪽으로 정하는 것**이다.

---

# 5. 권장 도메인 구조

실제 Repository 구조를 먼저 확인하고 기존 구조를 존중한다.

장기 Target의 예시는 다음과 같다.

```text
src/
├─ app/
├─ screens/
│  ├─ main/
│  ├─ prologue/
│  ├─ worldMap/
│  ├─ map/
│  ├─ battle/
│  ├─ event/
│  ├─ shop/
│  ├─ rest/
│  ├─ reward/
│  └─ result/
├─ game/
│  ├─ systems/
│  ├─ state/
│  ├─ events/
│  ├─ phaser/
│  ├─ save/
│  └─ utils/
├─ data/
│  ├─ blocks/
│  ├─ combinations/
│  ├─ monsters/
│  ├─ encounters/
│  ├─ dungeons/
│  └─ events/
├─ components/
└─ assets/
```

이 구조를 맞추기 위해 현재 파일을 한 번에 모두 옮기지 않는다.

새 기능을 만들 때 기능 소유권을 명확히 하는 기준으로 사용한다.

---

# 6. Game Rule 계층

## 6.1 System의 책임

게임 규칙은 가능한 한 React, Phaser, DOM에 독립적인 함수 또는 Module로 작성한다.

예:

- Damage System
- Status System
- Combination System
- Deck System
- Reward System
- Map Generation System
- Encounter System
- Save System

## 6.2 순수 함수 우선

가능한 규칙 계산은 다음 형태를 우선한다.

```text
Input State + Command
→ Calculation
→ Result
```

예:

```text
calculateDamage(attacker, target, packet)
→ rawDamage
→ appliedDamage
→ armorDamage
→ hpDamage
```

함수 내부에서 UI를 직접 조작하지 않는다.

## 6.3 Random 제어

Random에 의존하는 규칙은 Seed 또는 주입 가능한 RNG를 사용해 재현 가능하도록 한다.

특히:

- Map Generation
- Encounter 결정
- Battle 초기 Shuffle
- Monster 확률 Pattern
- Reward 후보

에서 Save/Continue 또는 Test를 위해 Random 결과를 재현할 수 있어야 한다.

---

# 7. Command / Event 원칙

복잡한 화면 동작은 직접 여러 상태를 수정하기보다 의미 있는 Command 또는 Event로 전달한다.

예:

```text
END_TURN
SELECT_MONSTER
PLACE_BLOCK
REMOVE_BLOCK
OPEN_BLUEPRINT
MAP_NODE_SELECTED
SHOP_ENTER_PURCHASE
SHOP_ENTER_CLEANUP
SAVE_AND_QUIT
```

Command/Event 이름은 구현 기술보다 게임 의미를 우선한다.

UI Component 내부에서 여러 도메인 상태를 직접 수정하는 구조를 줄인다.

---

# 8. Battle 구현 원칙

전투 규칙은 `BLOCKABLE_COMBAT_SYSTEM.md`를 따른다.

## 8.1 Monster Intent

Monster의 이번 Turn Ability는 Combat Logic에서 한 번 결정한다.

```text
Pattern / AI
→ Planned Ability
→ Presentation
→ 동일 Ability 실행
```

금지:

```text
Monster Detail UI에서 Random
Monster Turn에서 다시 Random
```

Planned Action의 Source of Truth는 Combat State다.

## 8.2 Preview

Preview는 실제 상태를 변경하면 안 된다.

예:

- Expected Damage
- Attack Range
- Combination Effect
- Placement Ghost

Preview 계산에서 HP, Armor, Stack, Deck를 실제로 Mutation하지 않는다.

## 8.3 Presentation Event

실제 계산 결과와 연출을 분리한다.

예:

```text
Damage Result
→ HP State Update
→ DAMAGE_PRESENTATION Event
→ Phaser Damage Text / Hit Animation
```

연출이 Combat 결과의 Source of Truth가 되어서는 안 된다.

---

# 9. Map 구현 원칙

지도 규칙은 `BLOCKABLE_MAP_SYSTEM.md`를 따른다.

## 9.1 Graph와 UI 좌표 분리

Node의 실제 연결:

```text
edges
```

화면 표시:

```text
position x/y
```

를 구분한다.

좌표가 가까워 보인다는 이유로 이동 가능하다고 판단하지 않는다.

## 9.2 Generated Data와 Runtime State 분리

Generated:

- Node
- Edge
- Type
- Content Reference

Runtime:

- Current
- Revealed
- Cleared
- Reward Claimed
- Shop State

를 구분한다.

## 9.3 Load에서 재생성 금지

진행 중 Save는 생성된 Map 자체를 복원한다.

현재 Generator Version으로 다시 생성하여 구조를 바꾸지 않는다.

---

# 10. Save / Continue 원칙

Save Data는 브라우저에서 변경될 수 있는 외부 입력으로 취급한다.

## 10.1 저장 데이터 검증

- Schema Version 확인
- 필수 Field 확인
- Type 확인
- Enum 확인
- 유효한 ID Reference 확인

손상 데이터를 바로 기존 Save 위에 덮어쓰지 않는다.

## 10.2 Battle Continue

전투 중 종료 시 정확한 Mid-turn Snapshot이 아니라 **Battle Start State**로 복원한다.

같은 Encounter와 Initial Random 결과를 복원한다.

따라서 저장해야 할 수 있는 정보:

- Encounter ID
- Battle Seed
- Monster Composition
- Initial Deck State
- Initial Shuffle 결정 정보

## 10.3 Quit와 Death 분리

```text
QUIT_TO_MAIN
→ Save
→ Main
→ Run 유지
```

```text
PLAYER_DEAD
→ GameOver
→ Run 종료
```

두 Event를 같은 저장 처리로 합치지 않는다.

---

# 11. Data-driven Block / Monster 구조

## 11.1 Designer 흐름

```text
Block Designer / Monster Designer
        ↓
JSON Output
        ↓
Validation
        ↓
Game Data
        ↓
Common Effect Interpreter
        ↓
Runtime
```

## 11.2 Effect 해석

Runtime은 다음 필드를 기준으로 실행한다.

```text
type
parameters.id
value
target
```

`effect_name`과 `description`은 표시와 진단을 위한 정보다.

이름이나 자연어 설명에서 실행 의미를 임의 추론하지 않는다.

## 11.3 Spec Version

현재 Combat Effect Spec은 `0.5.4`다.

- JSON의 `metadata.combat_effect_spec_version` 확인
- 지원하지 않는 Version 자동 변환 금지
- 새 Type / ID 임의 연결 금지

## 11.4 ID 기반 참조

특정 Block/Monster 이름 문자열로 규칙을 하드코딩하지 않는다.

가능하면:

- ID
- Grade
- Tag
- Data Reference
- Config

를 사용한다.

프로토타입 임시 이름 기반 조건이 있다면 가능한 한 한 곳에 국소화하고 정식 설계로 확장하지 않는다.

---

# 12. UI Layout 원칙

## 12.1 기준 화면

Blockable의 주요 화면은 16:9를 기본 디자인 비율로 한다.

4K / 2K / 1K 등 서로 다른 해상도에서도 같은 상대적 구성을 유지하는 것을 목표로 한다.

## 12.2 상대 배치

장기 기준:

- Parent-relative
- Flexbox
- Grid
- `%`
- `vw/vh`의 제한적 사용
- Container Query 또는 적절한 Responsive Rule

를 우선한다.

Viewport Pixel Hardcode를 여러 컴포넌트에 중복하지 않는다.

## 12.3 Prototype 예외

마감 과정에서 고정값을 사용할 수 있다.

단:

- 한 곳에 국소화
- 완료된 UI의 기준 좌표를 무작정 다시 변경하지 않음
- 추후 Responsive 구조로 교체 가능한 형태 유지

를 우선한다.

---

# 13. UI 좌표 문제 수정 절차

Blockable 개발 과정에서 React DOM, Phaser Canvas, Browser Viewport의 좌표계가 다르기 때문에 단순 Screenshot Guess만으로 수정하면 반복 비용이 커진다.

Codex는 UI 위치 문제에서 다음 순서를 따른다.

1. 실제 DOM Parent 확인
2. Containing Block 확인
3. CSS Computed Position 확인
4. Phaser Logical Resolution 확인
5. FIT / Scaling 확인
6. Browser Viewport 기준 좌표와 비교
7. 필요한 Delta만 수정

사용자가 실제 화면에서 측정한 `ΔX`, `ΔY`가 있다면 그 값을 우선적인 검증 정보로 사용한다.

같은 문제에 Transform을 반복 누적하지 않는다.

---

# 14. 이미 완료된 UI 보호

Codex가 특정 UI만 수정하라는 요청을 받으면 이미 완료된 다른 영역을 건드리지 않는다.

예:

- Monster HP가 완료됐으면 Status 수정 중 HP Layout을 재설계하지 않는다.
- Common Game Menu 수정 중 Battle Board를 이동하지 않는다.
- Player Status Tooltip 수정 중 Monster Status가 정상이라면 Monster 쪽을 변경하지 않는다.

작업 범위가 작으면 변경 파일 수도 작게 유지한다.

---

# 15. Asset 관리

## 15.1 기본 원칙

- 동일 Asset을 여러 위치에 중복 복사하지 않는다.
- Runtime이 사용하는 실제 경로를 하나의 Source로 둔다.
- 파일명 Typo가 이미 Runtime Contract가 된 경우 사용자 승인 없이 임의 Rename하지 않는다.

## 15.2 역할별 Asset

공용:

```text
src/assets/
```

화면 전용:

```text
screens/<screen>/assets/
```

등 현재 Repository 규칙을 우선한다.

## 15.3 React / Phaser Loading

- React는 Bundler가 처리할 수 있는 import 또는 현재 프로젝트 URL 규칙 사용
- Phaser는 preload 또는 Asset Manager를 사용
- 같은 Phaser Key 중복 등록 금지

---

# 16. Sound와 Animation

현재 Repository에서 사용하는 Sound/Animation Library를 먼저 확인한다.

## 16.1 React DOM Animation

React DOM Animation은 현재 프로젝트에서 이미 사용하는 방식이 있으면 재사용한다.

Motion Library를 사용한다면 React DOM에 한정한다.

## 16.2 Phaser Animation

Canvas 내부 Block, Hit, Damage, Monster Attack 등의 동적 연출은 Phaser Tween / Animation을 우선한다.

React Animation Library로 Phaser Object를 직접 제어하지 않는다.

## 16.3 Sound

현재 Sound Manager가 있다면 그것을 단일 진입점으로 사용한다.

새 기능마다 Audio Object를 직접 반복 생성하지 않는다.

---

# 17. State Management

현재 Repository의 실제 State Layer를 먼저 확인한다.

## 17.1 장기 상태

예:

- HP
- Gold
- Deck
- Dungeon Progress
- Map
- Blueprint Discovery
- Save Data

## 17.2 진행 상태

예:

- Current Screen
- Battle Phase
- Reward Pending
- Event Step
- Monster Planned Action

## 17.3 Presentation-only 상태

예:

- Tooltip Hover
- Modal Open
- Animation Playing
- Temporary Selection Highlight

## 17.4 Library 도입 원칙

Zustand, XState 등 특정 Library가 이미 사용 중이라면 그 역할을 존중한다.

사용 중이 아니라면 단순 기능을 위해 새 Library를 임의 추가하지 않는다.

대규모 State Migration은 별도 승인 작업으로 취급한다.

---

# 18. Codex 작업 절차

## 18.1 작업 전

1. 요청 범위를 정확히 읽는다.
2. 관련 파일을 우선 확인한다.
3. 기존 같은 기능이 있는지 찾는다.
4. 현재 Source of Truth를 찾는다.
5. 변경 범위를 최소화한다.

관련 없는 전체 Repository를 반복해서 읽지 않는다.

## 18.2 구현 중

- 기존 Formatter / Component / System 재사용
- 동일 Logic 중복 구현 금지
- UI에서 데이터 다시 계산하지 않기
- 이름 문자열보다 ID / Data Reference 사용
- 임시 구현은 한 곳에 국소화
- 사용자가 완료했다고 한 영역 보호

## 18.3 작업 후

가능한 범위에서:

- Build
- Lint
- Test
- Runtime 확인

을 수행한다.

테스트하지 못한 항목은 완료한 것처럼 보고하지 않는다.

---

# 19. Codex 요청 범위 보호

다음 행위를 금지한다.

- 요청 없는 대규모 Refactor
- 요청 없는 Library 교체
- 요청 없는 Folder 전면 재구성
- 요청 없는 Asset Rename
- 완료된 UI 전면 재배치
- 게임 규칙을 문서 확인 없이 임의 변경
- 새 Effect의 의미를 자연어로 추론하여 구현

사용자가 "이 파일만", "이 UI만", "이 로직만"이라고 지정하면 그 범위를 우선한다.

---

# 20. Git / GitHub 규칙

Repository 읽기와 분석은 자유롭게 수행할 수 있다.

하지만 다음 Write 작업은 **사용자의 명시적 허가를 받은 뒤에만** 수행한다.

- Git Commit
- Git Push
- GitHub 파일 수정
- Branch 생성 및 Merge
- Pull Request 생성

Codex가 작업을 완료했다고 해서 자동 Commit/Push하지 않는다.

사용자가 `commit / push 하지 마세요`라고 지정한 경우 절대 수행하지 않는다.

---

# 21. 테스트 원칙

## 21.1 System Test

가능하면 다음을 독립적으로 테스트한다.

- Damage
- Armor
- Status
- Deck Cycle
- Combination
- Map Generation
- Save/Load
- Reward
- Shop Transaction

## 21.2 Random Test

Random 기반 기능은 고정 Seed로 재현 가능하게 한다.

## 21.3 UI Regression

UI 변경 시 요청 대상뿐 아니라 바로 인접한 완료 영역의 Regression을 확인한다.

예:

- Player Status 수정 → Monster Status 유지 확인
- Common Menu 수정 → Battle Layout 유지 확인
- Map 이동 수정 → Node Completion 유지 확인

## 21.4 Production Build

배포 경로, Asset, Screen 변경 후 production build를 확인한다.

---

# 22. 정적 배포

- Browser에서 별도 설치 없이 실행 가능해야 한다.
- Static HTML / JS / CSS / Asset으로 배포 가능해야 한다.
- GitHub Pages의 Sub Path를 고려한다.
- 절대 Root Path 하드코딩을 피한다.
- SPA Routing을 사용할 경우 배포 환경의 직접 URL 접근을 검토한다.
- Local Dev Server에서만 동작하는 경로를 남기지 않는다.

---

# 23. 보안과 저장 신뢰성

## 23.1 Frontend Secret 금지

API Key, Password, Secret Token을 Browser Bundle에 넣지 않는다.

## 23.2 Save Data

Local Save는 사용자 또는 외부 도구가 변경할 수 있다고 가정한다.

- Schema 검증
- Type 검증
- Range 검증
- Enum 검증
- ID Reference 검증

후 사용한다.

## 23.3 XSS

- 사용자 문자열을 HTML로 직접 삽입하지 않는다.
- 불필요한 `dangerouslySetInnerHTML` 사용 금지
- `eval`, `new Function` 금지

---

# 24. Prototype 임시 구현 원칙

마감 때문에 임시 구현이 필요한 경우 허용할 수 있다.

단 다음 원칙을 적용한다.

1. 핵심 Combat Formula를 임시 규칙으로 복제하지 않는다.
2. Save/Load의 Source of Truth를 우회하지 않는다.
3. Temporary Rule은 가능한 한 Config 또는 한 Module에 모은다.
4. 여러 화면에 같은 Hardcode를 복제하지 않는다.
5. 정식 Game Design을 임시 코드에 맞춰 왜곡하지 않는다.
6. 추후 제거 지점을 식별할 수 있게 한다.

권장 표시:

```text
TODO: prototype hardcode
TODO: replace according to game design / development guide
```

버그 수정 과정의 상세 내역을 정식 Architecture 문서에 누적 기록하지 않는다.

---

# 25. 현재 사용 중인 핵심 구현 구조

현재 프로젝트에서 큰 틀로 사용하는 구조:

- React 기반 Screen / DOM UI
- Phaser 기반 Battle Board / Dynamic Interaction
- JSON 기반 Block / Monster / Combination Data
- Browser Run Save
- Static Web Build / Deployment
- React와 Phaser 사이의 명시적인 정보 전달
- Data-driven Combat Effect 해석

세부 Library 사용 여부는 실제 Repository를 기준으로 확인한다.

---

# 26. 장기 Target / 아직 정리가 필요한 구조

이 절은 게임 기능의 미구현 목록이 아니라 **Architecture의 장기 정리 목표**다.

- UI → Command/Event → Engine → Result → Presentation 흐름의 일관된 적용
- Game Rule의 System 계층 집중
- Presentation State 분리
- Save Schema Versioning 강화
- Random Seed 관리 일원화
- Map / Battle / Event의 공통 Event 규격 정리
- State Ownership 명확화
- 공통 Asset Manager 정리
- 공통 Sound Manager 정리
- 순수 함수 기반 Unit Test 확대
- Temporary Hardcode 제거
- Responsive Container-relative UI 정리

현재 Target Architecture 미도달

- Encounter 생성 책임이 App/UI 계층에 일부 존재
- Encounter System 또는 이에 해당하는 Game System 계층으로 분리 필요


이 항목을 현재 모두 구현 완료한 것으로 문서화하지 않는다.

---

# 27. AI / Codex 개발에서 얻은 운영 원칙

Blockable은 AI-assisted Development를 적극 사용하는 프로젝트다.

AI에게 모든 판단을 맡기는 것이 아니라 다음 역할 분리를 사용한다.

## AI / Codex에 적합한 작업

- 반복적인 Component 구현
- Data Wiring
- 기존 Pattern을 이용한 기능 추가
- JSON Validation
- Build Error 분석
- 관련 파일 간 연결
- 구조적 중복 탐색

## 사람이 직접 판단해야 하는 작업

- 최종 Game Rule
- UI의 시각적 우선순위
- 실제 화면에서의 배치 품질
- 플레이 감각
- 무엇을 임시 구현으로 허용할지
- AI 수정 결과가 의도와 일치하는지 검증

Screenshot만 보고 좌표를 반복 추측시키는 방식보다, 사람이 실제 좌표와 차이를 측정하고 AI가 구조적으로 적용하는 방식이 효율적이다.

---

# 28. 최종 Codex 핵심 명령

> 기존 구조와 관련 파일을 먼저 확인하고 요청 범위 안에서 최소 수정한다. React는 Screen과 Static/DOM UI를, Phaser는 Dynamic Battle Board와 Canvas Input/Effect를 담당하되 동일한 요소를 중복 소유하지 않는다. 게임 규칙은 Presentation에 중복 구현하지 않고 Engine/System 계층의 단일 Source of Truth를 사용한다. Block/Monster Designer JSON은 `type + parameters.id + value + target`을 기준으로 검증·해석한다. Map과 Battle의 Random 결과는 Save/Continue에서 재현 가능해야 한다. Prototype 임시 구현은 가능한 한 국소화하고 정식 Game Design과 분리한다. 관련 Build/Test를 수행하고 미검증 사항은 명시한다. Git Commit/Push 및 GitHub Write는 사용자 승인 없이 수행하지 않는다.

