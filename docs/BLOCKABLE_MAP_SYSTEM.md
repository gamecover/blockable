# Blockable 지도 시스템 명세

문서 상태: 최신 기획 정리본  
대상 프로젝트: Blockable

관련 문서:

- `BLOCKABLE_GAME_DESIGN.md`
- `BLOCKABLE_COMBAT_SYSTEM.md`
- `BLOCKABLE_CODEX_DEVELOPMENT_GUIDE.md`

---

# 1. 문서 목적

이 문서는 **Blockable의 던전 지도가 어떻게 생성되고, 플레이어가 어떻게 이동하며, 생성 결과와 진행 상태를 어떻게 저장하는지**를 정의한다.

이 문서가 관리하는 범위:

- 전체 지도·던전·층·노드의 관계
- 주 경로와 브랜치
- 일반·위험 브랜치
- 난이도별 초기 생성 수치
- 노드 유형과 생성 한도
- 정보 공개
- 이동·재방문·자동 이동
- 계단과 보스 진입
- 지도 생성·검증
- Encounter 참조
- 저장·불러오기

개별 몬스터의 능력치·기술·행동 계산은 `BLOCKABLE_COMBAT_SYSTEM.md`가 관리한다.

상점·휴식·이벤트가 플레이어에게 어떤 선택을 제공하는지는 `BLOCKABLE_GAME_DESIGN.md`가 관리한다.

## 1.1 문서 우선순위

규칙이 충돌할 경우:

1. 최신 명시적 기획 결정
2. `BLOCKABLE_MAP_SYSTEM.md`
3. `BLOCKABLE_GAME_DESIGN.md`
4. 임시 구현 코드

순으로 판단한다.

---

# 2. 지도 계층

```text
전체 지도
└─ Dungeon
   └─ Floor
      └─ Node + Edge
```

## 2.1 전체 지도

- 해커톤 버전에는 일반 던전 2개와 중앙 최종 던전 1개가 존재한다.
- 일반 던전 2개는 원하는 순서로 공략할 수 있다.
- 일반 던전 2개를 모두 완료하면 중앙 최종 던전이 개방된다.

## 2.2 던전

던전은 하나의 연속된 탐험 단위다.

- 하나 이상의 Floor로 구성된다.
- Dungeon별 배경·Encounter Pool·이벤트 후보·난이도 설정을 가질 수 있다.
- Dungeon 완료 결과는 전체 지도 진행 상태에 반영한다.

## 2.3 층

층은 하나의 독립된 노드 그래프다.

- 시작 노드가 정확히 1개 존재한다.
- 일반 층은 계단 노드가 정확히 1개 존재한다.
- 최종 층은 계단 대신 보스 노드가 정확히 1개 존재한다.
- 모든 플레이 가능 노드는 시작 노드에서 도달 가능해야 한다.

## 2.4 중앙 최종 던전

현재 정식 게임 기획 기준으로 중앙 최종 던전은 **총 3층**이다.

이 규칙은 Dungeon 설정값으로 표현하는 것을 원칙으로 한다.

```text
central_furnace.floor_count = 3
```

특정 화면이나 코드의 조건문에서 층 수를 중복 하드코딩하는 것은 지도 시스템의 정식 구조가 아니다.

---

# 3. 핵심 용어

## 3.1 Node

하나의 방 또는 하나의 게임 경험을 나타낸다.

현재 주요 Node Type:

- `floor_start`
- `battle`
- `event`
- `shop`
- `rest`
- `elite`
- `reward`
- `stairs`
- `boss`

## 3.2 Edge

두 Node를 연결하는 이동 가능한 통로다.

실제 이동 가능 여부는 화면 좌표가 아니라 Edge 데이터로 판정한다.

## 3.3 주 경로

시작 노드에서 계단 또는 보스까지 이어지는 필수 경로다.

- 층마다 정확히 하나의 기본 주 경로를 생성한다.
- 시작에서 목적지까지 반드시 도달 가능해야 한다.
- 브랜치나 보조 통로가 주 경로보다 짧은 필수 진행 Shortcut을 만들면 안 된다.

## 3.4 브랜치

주 경로에서 갈라지는 선택 경로다.

브랜치 종류:

- 일반 브랜치
- 위험 브랜치

초기 버전에서는 브랜치 내부에서 다시 갈라지는 중첩 브랜치를 만들지 않는다.

## 3.5 경로 길이

| 용어 | 기준 |
|---|---|
| 경로 길이 | 이동하는 Edge 수 |
| 방문 노드 수 | 시작과 목적지를 포함한 Node 수 |
| 브랜치 길이 | 갈림길 다음부터 끝까지의 Node 수 |
| 브랜치 깊이 | 갈림길에서 브랜치 끝까지의 이동 횟수 |

---

# 4. 고유 블록 선택과 시작 노드

## 4.1 고유 블록 선택

고유 블록 선택은 Dungeon Map의 Node 콘텐츠가 아니다.

- 새 게임 시작 후 프롤로그를 진행한다.
- 최초 전체 지도 진입 전에 고유 블록을 한 번 선택한다.
- 이후 각 Dungeon 또는 Floor에서 다시 선택하지 않는다.

## 4.2 `floor_start`

모든 층의 시작 Node다.

- 정확히 1개 존재한다.
- 안전한 도착 지점이다.
- 별도 전투나 비용이 없다.
- 층 진입 시 자동으로 현재 위치가 된다.
- 진입 즉시 완료 상태로 처리할 수 있다.

---

# 5. 지도 시스템의 설계 목표

지도는 단순한 다음 전투 선택 메뉴가 아니다.

플레이어가 다음을 판단하게 해야 한다.

- 안전한 주 경로를 우선 진행할 것인가
- 추가 자원과 보상을 위해 브랜치를 탐험할 것인가
- 위험 브랜치의 강적에 도전할 것인가
- 보스 전에 상점·휴식·보상을 확보할 것인가
- 미탐험 브랜치를 포기하고 다음 층으로 갈 것인가

난이도는 세 축으로 분리한다.

| 난이도 축 | 조절 대상 |
|---|---|
| 지도 규모 | 층 수, 생성 Node 수, 주 경로 길이 |
| 탐험 복잡도 | 브랜치 수, 길이, 깊이, 보조 통로 |
| 전투 위험도 | Encounter 등급, 뒤쪽 층의 위험도 |

후반 난이도는 지도 크기를 무한히 늘리기보다 전투 위험도와 위험 브랜치 비중을 높이는 방향을 우선한다.

---

# 6. 층의 기본 구조

## 6.1 일반 층

```text
floor_start
→ Main Path
→ stairs
     ├─ Normal Branch
     └─ Risk Branch
```

## 6.2 최종 층

```text
floor_start
→ Main Path
→ boss
     ├─ Normal Branch
     └─ Risk Branch
```

## 6.3 보스 노드

- 최종 층에 정확히 하나 존재한다.
- 시작 노드에서 반드시 도달 가능해야 한다.
- 보스 뒤에 일반 Node를 생성하지 않는다.
- 보스 승리 시 해당 Dungeon의 완료 규칙을 실행한다.
- 중앙 최종 던전의 마지막 보스는 Dungeon Clear가 아니라 Game Clear로 연결된다.

---

# 7. 브랜치

## 7.1 일반 브랜치

일반 브랜치는 비교적 낮은 위험의 선택 기회를 제공한다.

배치 가능한 콘텐츠:

- 일반 전투
- 이벤트
- 상점
- 휴식
- 일반 보상

브랜치 마지막 Node는 가능하면 전투만 반복하기보다 보상·상점·휴식·이벤트 중 하나를 우선 고려한다.

## 7.2 위험 브랜치

위험 브랜치는 더 큰 위험과 보상을 제공한다.

기본 원칙:

- 주 경로가 아닌 브랜치에 생성한다.
- 강적 Encounter와 높은 가치의 보상을 연결한다.
- 보스 진행을 위해 반드시 클리어해야 하는 필수 경로로 만들지 않는다.
- 지도에서 일반 브랜치보다 위험하다는 사실을 사전에 알 수 있어야 한다.

위험의 비용은 이동 횟수보다 다음에서 발생한다.

- 추가 전투
- 강적 전투
- HP 손실 가능성
- 자원 소모
- 보스 전 준비 부족 가능성

## 7.3 조건부 브랜치

다음 기능은 향후 확장이다.

- 열쇠
- 특정 블록
- 업적
- 이벤트 결과

등으로 개방되는 조건부 브랜치.

---

# 8. 난이도별 초기 생성 수치

다음 값은 지도 생성과 플레이 테스트를 위한 초기 기준값이다. 숫자는 데이터로 조정할 수 있어야 하며 구현 코드 여러 곳에 중복해서 하드코딩하지 않는다.

| 난이도 | 전체 층 수 | 층당 생성 Node | 최대 Node | 필수 방문 Node | 권장 방문 Node | 주 경로 길이 | 브랜치 수 | 브랜치 길이 | 최대 깊이 | 위험 브랜치 | 강적 최대 | 보상 배율 |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 2 | 7~9 | 9 | 4~6 | 6~8 | 3~5 | 2~3 | 1~2 | 2 | 0~1 | 1 | ×1.1~1.5 |
| 2 | 2 | 6~8 | 8 | 4~5 | 5~7 | 3~4 | 1~2 | 1~2 | 2 | 0~1 | 1 | ×1.1~1.5 |
| 3 | 3 | 7~9 | 9 | 5~6 | 6~8 | 4~5 | 2 | 1~2 | 2 | 1 | 1 | ×1.1~1.6 |
| 4 | 3 | 7~10 | 10 | 5~6 | 6~9 | 4~5 | 2 | 1~2 | 2 | 1 | 1 | ×1.1~1.6 |
| 5 | 3 | 8~11 | 11 | 5~7 | 7~10 | 4~6 | 2~3 | 1~2 | 2 | 1 | 1 | ×1.2~1.7 |
| 6 | 3 | 9~12 | 12 | 6~7 | 8~11 | 5~6 | 2~3 | 1~3 | 3 | 1~2 | 2 | ×1.2~1.8 |
| 7 | 4 | 9~12 | 12 | 6~7 | 8~11 | 5~6 | 3 | 1~3 | 3 | 1~2 | 2 | ×1.2~1.8 |
| 8 | 4 | 10~13 | 13 | 6~8 | 9~12 | 5~7 | 3 | 1~3 | 3 | 2 | 2 | ×1.2~1.9 |
| 9 | 4 | 10~13 | 13 | 7~8 | 9~12 | 6~7 | 3~4 | 1~3 | 3 | 2 | 2 | ×1.3~2.0 |
| 10 | 4 | 11~14 | 14 | 7~9 | 10~13 | 6~8 | 3~4 | 1~3 | 3 | 2 | 2 | ×1.3~2.0 |

## 8.1 Dungeon별 Override

난이도 기본값과 별도로 Dungeon 고유 설정을 허용한다.

예:

- 중앙 최종 던전: `floor_count = 3`

Dungeon별 Override는 데이터에서 한 곳의 Source of Truth로 관리한다.

## 8.2 층 진행 보정

같은 Dungeon에서도 뒤쪽 Floor의 전투 위험도는 높아질 수 있다.

```text
floorProgress = (currentFloor - 1) / max(totalFloor - 1, 1)
```

`floorProgress`는 Encounter 선택·보상 시스템에 전달할 수 있다.

Map Generator가 몬스터의 실제 Damage 배율을 직접 계산하지 않는다.

---

# 9. 노드 유형

| Node Type | 의미 | 재방문 |
|---|---|---|
| `floor_start` | 층 시작 | 가능 |
| `battle` | 일반 전투 | 승리 후 빈 완료 Node |
| `event` | 이벤트 | 완료 결과 확인만 가능 |
| `shop` | 상점 | 같은 층에서 재방문 가능 |
| `rest` | 휴식 | 사용 후 재사용 불가 |
| `elite` | 강적 전투 | 승리 후 완료 |
| `reward` | 보상 | 수령 후 재획득 불가 |
| `stairs` | 다음 층 이동 | 층 이동 전까지 접근 가능 |
| `boss` | 보스 전투 | 승리 시 Dungeon 또는 Game 진행 |

## 9.1 Map과 Encounter 책임 분리

Map System은 Node의 역할까지만 결정한다.

예:

```text
battle Node
→ battle Encounter Pool 참조

elite Node
→ elite Encounter Pool 참조

boss Node
→ boss Encounter 참조
```

Map Generator가 특정 Monster 이름을 기준으로 직접 Spawn Logic을 작성하지 않는다.

실제 Monster 구성은 Encounter/Monster Data 계층에서 결정한다.

---

# 10. Node 완료 규칙

## 10.1 전투

```text
Node 진입
→ resolving
→ Battle
→ Victory
→ reward_pending (필요한 경우)
→ Reward 완료
→ cleared
```

보상이 남아 있으면 Node를 완전히 완료한 것으로 처리하지 않는다.

## 10.2 Event

```text
Node 진입
→ Event 선택
→ 결과 적용
→ cleared
```

재방문 시 선택과 보상을 다시 실행하지 않는다.

## 10.3 Rest

- 선택한 휴식 서비스를 처리한 뒤 완료한다.
- 완료한 Node에서는 Rest 효과를 다시 사용할 수 없다.

## 10.4 Shop

Shop은 다른 완료 Node와 달리 현재 Floor에 머무는 동안 다시 열 수 있다.

단 같은 Shop Node의 상태를 유지한다.

- 이미 생성한 구매 후보 유지
- 사용한 서비스 횟수 유지
- 구매/정리 결과 유지
- 재방문으로 후보 재추첨 금지
- 재방문으로 가격 진행 상태 초기화 금지

새로운 Shop Node는 별도의 독립 상태를 가진다.

## 10.5 Reward

- 수령 여부를 별도 상태로 저장한다.
- 재방문이나 Save/Load로 같은 보상을 두 번 받을 수 없다.

---

# 11. 방 유형별 생성 원칙

## 11.1 필수 Node

- `floor_start`: 층당 정확히 1개
- `stairs` 또는 `boss`: 층당 정확히 1개

## 11.2 최대 개수와 배치 제한

초기 기준:

- 상점: 층당 최대 1개
- 보상: 층당 최대 1개
- 강적: 난이도 설정의 최대 개수 이하
- 위험 브랜치: 난이도 설정 범위 이하
- 동일 전투 계열 Node: 최대 2개 연속
- 보스 직전 Node: 일반 전투·상점·휴식 중 하나를 우선

## 11.3 회복 배치

초기 Map Spec의 기본 원칙:

- 시작→계단/보스 최단 경로의 후반부에 휴식 기회를 확보한다.
- 추가 휴식 Node는 층당 과도하게 생성하지 않는다.

정확한 생성 확률은 밸런스 데이터에서 관리한다.

---

# 12. 브랜치 보상

위험과 깊이를 보상 가치에 반영한다.

개념식:

```text
finalRewardMultiplier
= baseBranchMultiplier
× depthModifier
× riskModifier
```

난이도별 보상 배율의 최소·최대값 안에서 Clamp할 수 있다.

보상 증가는 단순한 모든 수치 일괄 곱셈이 아니다.

적용 후보:

- Gold 증가
- 높은 등급 보상 확률 증가
- 보상 선택지 증가
- 특별 보상 출현 확률 증가

하나의 위험 브랜치 보상은 한 번만 획득할 수 있다.

---

# 13. 지도 생성 입력

Map Generator는 최소 다음 입력을 사용한다.

```text
Dungeon ID
Difficulty
Random Seed
Generator Version
Dungeon Config
Allowed Node Types
```

같은 입력과 같은 Generator Version은 같은 생성 결과를 재현할 수 있어야 한다.

단 진행 중인 Save를 Load할 때는 Map을 다시 생성하는 것이 아니라 **이미 저장한 생성 결과를 사용**하는 것을 기본으로 한다.

---

# 14. 지도 생성 절차

## 14.1 전체 순서

1. Dungeon 설정과 난이도 확정
2. 전체 Floor 수 확정
3. Floor별 목표 Node 수 결정
4. Branch 최소 예산 예약
5. Main Path 생성
6. Branch 생성
7. 필요 시 근접 Node 보조 통로 생성
8. 필수 Node Type 배치
9. 나머지 Node Type 배치
10. Encounter/Event/Shop 등의 Content Reference 연결
11. 전체 유효성 검증
12. 실패 시 재생성
13. 반복 실패 시 안전 Template 사용
14. 생성 결과 저장

## 14.2 Main Path

- 시작과 목적지를 잇는 단순 경로를 먼저 만든다.
- 완전히 수평인 일자형만 반복되지 않도록 가로·세로 진행을 섞는다.
- Node UI가 겹치지 않도록 논리 좌표를 분리한다.
- 목적지 방향은 Seed 기반으로 다양화한다.

## 14.3 Branch

- 시작과 목적지를 제외한 Main Path 중간 Node에서 생성한다.
- 난이도별 Branch Count와 Length 범위를 사용한다.
- 남은 Node Budget을 넘지 않는다.
- 길이가 2 이상이면 완전 일자 반복보다 꺾이는 형태를 우선한다.
- Risk Branch는 지정된 수만큼 선택한다.

## 14.4 보조 통로

가까운 Node 사이에 보조 Edge를 추가할 수 있다.

- 격자상 인접한 Node만 후보로 사용한다.
- 시작 Node와 목적지에 직접 Shortcut을 추가하지 않는다.
- 보조 Edge 때문에 시작→목적지 최단 필수 경로가 짧아지면 안 된다.
- 제한적인 순환 경로는 허용한다.

---

# 15. Content Reference 결정 시점

Node가 어떤 콘텐츠를 실행할지 가능한 한 **지도 생성 시 또는 최초 공개 이전에 확정**하는 것을 권장한다.

예:

```text
battle → encounter_id
elite → encounter_id
boss → boss_encounter_id
event → event_id
shop → shop_state_id
```

목적:

- Save/Load 후 재추첨 방지
- Main 이동 후 Continue 악용 방지
- 같은 Seed/Save의 재현성 확보

특히 전투를 시작한 뒤 Main으로 나갔다가 Continue해도 Encounter가 바뀌면 안 된다.

---

# 16. 지도 유효성 검증

생성된 Floor는 플레이 전에 검증을 통과해야 한다.

## 16.1 그래프 검증

- 시작 Node 정확히 1개
- 목적지 Node 정확히 1개
- 모든 Node 도달 가능
- 고립 Node 없음
- 자기 자신으로 연결되는 Edge 없음
- 동일 Node 쌍의 중복 Edge 없음
- 모든 Content Reference가 유효함

## 16.2 경로 검증

- 시작→목적지 경로 존재
- 최단 경로가 난이도 범위 만족
- Branch가 필수 진행 Shortcut을 만들지 않음
- 목적지 뒤에 일반 Node가 없음
- 다음 층으로 이동하기 전 모든 필수 진행이 가능함

## 16.3 규모 검증

- Node 수가 설정 범위 안
- 최대 Node 수 초과 금지
- Branch 수·길이·깊이 범위 만족
- Risk Branch 수가 설정 범위 안

## 16.4 콘텐츠 검증

- 상점·휴식·보상 최대 개수 위반 없음
- 전투 계열 3연속 금지
- 위험 브랜치에 강적·보상 목적 존재
- Boss Content Reference 존재

## 16.5 실패 처리

- Floor당 최대 재생성 횟수를 둔다.
- 반복 실패하면 해당 난이도의 안전 Template을 사용한다.
- 개발 모드에서는 실패 Seed와 원인을 기록한다.

---

# 17. Node Runtime 상태

## 17.1 진행 상태

```text
locked
→ available
→ current
→ resolving
→ reward_pending
→ cleared
```

| 상태 | 의미 |
|---|---|
| `locked` | 현재 이동 불가 |
| `available` | 이동 가능한 다음 Node |
| `current` | 현재 위치 |
| `resolving` | 콘텐츠 진행 중 |
| `reward_pending` | 본 콘텐츠 완료, 보상 대기 |
| `cleared` | 콘텐츠와 보상 완료 |

Shop은 별도의 `revisitable` 속성을 가질 수 있다.

## 17.2 공개 상태

진행 상태와 정보 공개 상태를 분리한다.

```text
hidden
→ revealed
→ visited
```

- 현재 Node 주변 정보는 공개한다.
- 가까운 미방문 Node는 종류 또는 미확인 정보로 보여줄 수 있다.
- 먼 Node의 상세 콘텐츠는 숨긴다.
- 방문한 결과는 유지한다.

---

# 18. 이동

## 18.1 직접 이동

플레이어는 현재 Node와 Edge로 연결된 이동 가능한 Node로 이동할 수 있다.

## 18.2 자동 이동

완료된 Node만 통과하는 경로라면 여러 칸 자동 이동할 수 있다.

조건:

- 중간 Node가 모두 완료됨
- 잠긴 Node 없음
- 진행 중 Encounter 없음
- Reward Pending 없음

## 18.3 이동 불가

다음 상황에서는 지도 이동을 막는다.

- 전투 진행 중
- 이벤트 선택 중
- 보상 선택 중
- Node 진입 처리 중
- Floor 전환 중

## 18.4 재방문

- 완료한 Node 재방문 가능
- 완료 콘텐츠 재실행 금지
- Shop은 같은 Floor 안에서 기존 상태로 다시 열 수 있음

## 18.5 이동 비용

현재 기본 게임에는 별도의 이동 Point나 이동 자원을 사용하지 않는다.

위험의 비용은 Node 콘텐츠의 전투와 자원 소비에서 발생한다.

---

# 19. 계단과 보스 진입

계단 또는 보스 Node를 선택했을 때 미탐험 Branch가 남아 있으면 경고할 수 있다.

예:

```text
아직 탐험하지 않은 길이 있습니다.
이 층을 떠나면 다시 돌아올 수 없습니다.

[계속 탐험] [진행]
```

- 진행 취소: 현재 층 유지
- 진행 확정: 다음 층 또는 보스 전투 진행
- 다음 층 진입 후 이전 층 복귀 불가
- 완료된 Shop의 남은 미구매 후보는 미탐험 Branch로 계산하지 않는다.

---

# 20. 지도 UI 의미

지도 UI는 최소 다음을 전달해야 한다.

- Dungeon 이름
- 현재 Floor
- 현재 Node
- Node와 Edge
- Node Type
- 현재 위치
- 이동 가능
- 완료
- 위험
- Player HP / Gold 등의 핵심 진행 정보

상태는 색상 하나만으로 구분하지 않는다.

권장 의미:

- 이동 가능: 명확한 강조
- 완료: 낮은 채도 또는 완료 표식
- 위험: 경고색 + Icon/Border
- 현재 위치: 별도 Marker와 강조
- 선택 불가: 낮은 명도와 Input 차단

구체 CSS 색상·좌표는 Map System의 정식 규칙이 아니다.

---

# 21. 데이터 구조 예시

## 21.1 Dungeon

```json
{
  "schema_version": 1,
  "generator_version": "map-gen-1",
  "dungeon_id": "ash_forge",
  "difficulty": 5,
  "seed": "run-seed-00042",
  "current_floor": 1,
  "floors": []
}
```

## 21.2 Floor

```json
{
  "id": "ash_forge_f1",
  "floor_index": 1,
  "start_node_id": "f1_n0",
  "destination_node_id": "f1_n6",
  "destination_type": "stairs",
  "current_node_id": "f1_n0",
  "node_ids": [],
  "edges": [],
  "branch_ids": [],
  "status": "active"
}
```

## 21.3 Node

```json
{
  "id": "f1_n3",
  "type": "battle",
  "path_role": "main",
  "branch_id": null,
  "branch_depth": 0,
  "content_ref_id": "ash_forge_battle_pool_01",
  "encounter_id": "encounter_001",
  "progress_state": "available",
  "reveal_state": "revealed",
  "revisitable": false,
  "reward_claimed": false,
  "position": { "x": 3, "y": 0 }
}
```

## 21.4 Edge

```json
{
  "id": "f1_e2",
  "from": "f1_n2",
  "to": "f1_n3",
  "bidirectional": true,
  "path_role": "main"
}
```

## 21.5 Branch

```json
{
  "id": "f1_b1",
  "type": "risk",
  "anchor_node_id": "f1_n2",
  "node_ids": ["f1_n7", "f1_n8"],
  "depth": 2,
  "reward_multiplier": 1.5,
  "completed": false
}
```

---

# 22. 생성 데이터와 Runtime 데이터 분리

## 22.1 생성 데이터

- Dungeon ID
- Difficulty
- Seed
- Floor 수
- Node / Edge
- Main Path / Branch
- Node Type
- Content Reference
- Reward Multiplier
- 논리 UI 좌표

## 22.2 Runtime 데이터

- 현재 Floor
- 현재 Node
- 공개 상태
- 방문 상태
- 완료 상태
- Reward 수령 여부
- Shop 상태
- Branch 완료 여부
- 현재 진행 중 Encounter

Runtime 상태를 변경하기 위해 생성 원본 그래프를 다시 만들지 않는다.

---

# 23. 저장 및 불러오기

## 23.1 저장 대상

최소 다음을 저장한다.

- `schema_version`
- `generator_version`
- Seed
- 생성된 전체 Node / Edge
- Content Reference / Encounter ID
- 현재 Floor / Node
- Node 진행 상태
- 공개 상태
- Reward 수령 여부
- Shop 상태
- Branch 상태
- 플레이어 Run 상태와 연결되는 참조
- 전투 시작 상태 복원을 위한 Encounter 정보

## 23.2 생성 지도 재생성 금지

진행 중 Save를 Load할 때 Seed만 이용해 현재 Generator로 지도를 새로 만드는 방식을 기본으로 사용하지 않는다.

이유:

- Generator Version이 바뀌면 진행 중 지도가 달라질 수 있다.
- Node Type과 Encounter가 바뀔 수 있다.
- 보상 중복이나 진행 불일치가 발생할 수 있다.

따라서 생성된 Graph 자체를 저장한다.

Seed는 재현과 Debug용으로 함께 보관한다.

## 23.3 Encounter 재추첨 금지

한 번 확정된 Encounter는 Save/Load로 다시 추첨하지 않는다.

특히:

```text
Battle 진입
→ Main 이동
→ Continue
```

과정을 반복해도 같은 Encounter와 같은 전투 시작 Random 상태를 사용해야 한다.

## 23.4 보상 중복 방지

Node 완료와 Reward 수령을 분리 저장한다.

```text
Battle Victory
→ reward_pending
→ Reward 선택
→ reward_claimed
→ cleared
```

이미 받은 보상을 Load 후 다시 생성하지 않는다.

---

# 24. 전투 시스템 연동

```text
Battle Node 진입
→ 저장된 encounter_id 확인
→ Combat 생성
→ BLOCKABLE_COMBAT_SYSTEM 실행
→ 결과 수신
→ Reward 처리
→ Node 완료
```

Map System은 다음을 직접 계산하지 않는다.

- Damage
- Armor
- Status
- Monster Ability
- Turn Order 계산

Combat 결과만 받아 Node 진행 상태를 갱신한다.

---

# 25. 이벤트 / 상점 / 휴식 연동

## 25.1 Event

```text
Event Node
→ event_id 로드
→ 선택/결과
→ 완료 결과 수신
→ Node cleared
```

## 25.2 Shop

```text
Shop Node
→ 기존 Shop State 확인
→ 없으면 최초 후보 생성
→ 이용
→ 상태 저장
→ Map 복귀
```

같은 Shop Node를 다시 방문하면 같은 상태를 사용한다.

## 25.3 Rest

```text
Rest Node
→ 휴식 선택
→ 결과 적용
→ Node cleared
```

완료 후 다시 효과를 실행하지 않는다.

---

# 26. 예외 처리

## 26.1 Content Reference 누락

- 개발 모드: 누락 ID와 원인을 명확히 로그
- 일반 모드: 안전한 폴백을 사용할 수 있음
- Boss Reference 누락: Dungeon 진행을 강제로 이어가지 않고 명확한 오류 처리

## 26.2 이동 중 중복 입력

- 첫 이동 요청 후 입력 잠금
- 이동 완료 전 추가 Node 클릭 무시
- 화면 연출 완료와 실제 위치 변경을 하나의 진행 상태로 관리

## 26.3 전투 결과 중복 수신

동일 Battle 결과가 여러 번 들어와도 Reward와 Node 완료를 중복 실행하지 않는다.

필요하면 Node별 `resolution_id` 등 멱등성 키를 사용한다.

## 26.4 손상 Save

- 현재 Node가 없으면 안전한 복구 여부를 판단한다.
- Graph가 손상된 경우 자동으로 Save를 덮어쓰지 않는다.
- 복구 불가능하면 사용자에게 새 Run/Dungeon 시작을 안내한다.

---

# 27. 개발 모드

개발 모드는 Map System 검증을 위한 별도 도구다.

확인 가능 정보:

- Seed
- Generator Version
- Difficulty
- 목표/실제 Node 수
- Main Path 길이
- Branch 수·길이·종류
- 최단 경로
- Node Type
- Content Reference
- Reward Multiplier
- Validation 결과

개발 기능 후보/현재 테스트 기능:

- 현재 Floor 전체 공개
- 선택 Node 직접 이동
- Node 상태 확인
- 같은 Seed 재생성
- 다른 Seed 생성
- 유효성 재검사

개발 기능이 일반 게임 진행 규칙의 Source of Truth가 되어서는 안 된다.

---

# 28. 현재 적용된 지도 핵심 범위

- World Map
- Dungeon 선택
- Dungeon → Floor → Node 계층
- Main Path
- Branch
- Risk Branch
- Node 공개 상태
- Node 완료 상태
- 완료 Node 재방문
- 완료 경로 자동 이동
- Stair Transition
- Boss Node
- Dungeon Clear
- 전체 생성 Graph 저장
- Encounter Reference 저장
- Save / Load
- Shop 재방문 상태 유지
- 일반 모드와 개발 모드 이동 차이

---

# 29. 미구현 / 향후 지도 확장

- 조건부 브랜치
- 비밀방
- 잠긴 문과 열쇠
- 브랜치 내부의 추가 분기
- 이전 Floor 복귀
- 이동 자원 / 이동 횟수
- 실시간 Map 변형
- Node 파괴
- Node 추가
- Edge 변경 효과
- Online Shared Seed
- Daily Dungeon
- Battle Node별 Encounter 참조의 사전 확정 및 저장
- Event Node별 Event 참조의 사전 확정 및 저장
- Save/Load 후 미진입 Node의 콘텐츠가 재추첨되지 않는 보장

이 항목은 `BLOCKABLE_GAME_DESIGN.md`의 전체 향후 확장 목록에도 포함한다.

---

# 30. 정식 Map System에서 제외하는 임시 구현

다음은 Map Specification으로 승격하지 않는다.

- 특정 Monster 이름을 직접 검사하는 Spawn 조건
- 일반 전투 노드의 `horde` 등급 및 2~3마리 편성 확률
- 해커톤 마감용 Encounter 하드코딩
- 임시 보스 중복 방지 로테이션 구현 세부
- 특정 Dungeon의 층 수를 여러 코드 위치에 직접 고정한 조건문
- Debug 전용 Node 배치
- UI 픽셀 좌표 보정 이력

정식 기획으로 확정된 결과만 데이터 구조와 시스템 규칙으로 표현한다.

---

# 31. 필수 테스트

## 31.1 생성

- 난이도별 다수 Seed 생성
- 시작 Node 1개 확인
- 계단/보스 1개 확인
- 모든 Node 도달 가능 확인
- 최대 Node 수 확인
- Branch 길이·깊이 확인
- Risk Branch 구성 확인
- 보조 Edge가 Shortcut을 만들지 않는지 확인
- Content Reference 유효성 확인

## 31.2 이동

- 인접 Node 이동
- 연결 없는 Node 이동 차단
- 완료 Node 왕복
- 완료 경로 자동 이동
- 진행 중 콘텐츠에서 이동 차단
- 빠른 중복 클릭 차단

## 31.3 저장

다음 상태에서 Save/Load를 검증한다.

- Floor 시작
- 일반 Node 이동 후
- Battle 시작 직전
- Battle Reward Pending
- Event 완료 후
- Shop 일부 이용 후
- Risk Branch 완료 후
- Stair 직전
- Boss 직전

검증 항목:

- Graph 동일
- 현재 위치 동일
- 공개/완료 상태 동일
- Shop 상태 동일
- Reward 중복 없음
- Encounter 재추첨 없음

---

# 32. 최종 구현 원칙

1. 지도는 `World Map → Dungeon → Floor → Node` 계층으로 관리한다.
2. 각 Floor에는 `floor_start`와 `stairs` 또는 `boss`가 정확히 하나 존재한다.
3. Main Path는 필수 진행, Branch는 선택 위험·보상이다.
4. Graph 연결과 화면 좌표는 분리한다.
5. Node Type과 실제 Encounter Contents는 분리한다.
6. 생성된 Map은 반드시 Validation을 통과한다.
7. 생성 결과는 Save에 저장하고 Load에서 임의 재생성하지 않는다.
8. Encounter Reference를 저장하여 Continue Reroll을 막는다.
9. 완료 콘텐츠는 재방문해도 재실행하지 않는다.
10. Shop은 같은 Node 재방문 시 기존 상태를 유지한다.
11. 전투 계산은 Combat System이 소유한다.
12. 개별 이벤트·상점·휴식의 게임 규칙은 Game Design과 해당 Data가 소유한다.
13. 프로토타입 임시 구현은 정식 Map Spec의 Source of Truth가 아니다.
