# Blockable

현재 버전: `v1.0.0`

**Blockable**은 블록을 거푸집에 배치해 싸우는 웹 기반 싱글 플레이 로그라이크 덱빌딩 게임입니다. 대장장이가 된 플레이어는 분기형 던전을 탐험하며 블록 주머니를 정비하고, 몬스터의 행동 예고에 맞춰 조합식과 색상 시너지를 만들어 최종 보스를 공략합니다.

## 핵심 플레이

- **블록 배치 퍼즐**: 매 턴 뽑은 블록을 드래그해 거푸집에 배치하고 `R` 키로 회전합니다.
- **행동 예고 전투**: 몬스터의 기술, 예상 피해, 범위, 부가 효과를 확인한 뒤 공격 대상을 정하고 턴을 종료합니다.
- **조합과 시너지**: 블록 모양으로 조합식을 만들고, 화염·물·자연 색상 구성으로 추가 시너지를 얻습니다.
- **런 기반 덱 정비**: 보상, 이벤트, 휴식, 상점에서 블록을 추가·변환·제거하며 현재 런의 주머니를 강화합니다.
- **청사진 발견**: 기본 조합은 처음부터 확인할 수 있고, 숨겨진 조합은 실제 전투 효과를 처음 사용했을 때 공개됩니다.

## 진행 흐름

```text
새 게임 → 프롤로그 → 고유 블록 선택 → 전체 지도
→ 던전 층 지도 탐험
→ 전투 / 이벤트 / 휴식 / 상점 / 보상
→ 던전 보스 또는 중앙 최종 던전 보스
→ 승리 또는 원정 실패
```

- 일반 던전 2개와 중앙 최종 던전 1개를 제공합니다.
- 던전은 층·노드·통로로 구성된 지도로 진행하며, 전투·강적·이벤트·휴식·상점·보상·계단·보스 노드를 만납니다.
- 시작 주머니는 기본 블록 12개와 선택한 고유 블록 1개로 구성됩니다.
- 일반 턴에는 블록 5개를 뽑고, 기본적으로 최대 3개를 배치할 수 있습니다.

## 전투와 상태 효과

전투는 기본 피해, 독립 피해, 방어도, 회복, 상태 효과를 공통 Effect 규격으로 처리합니다. 화상·출혈·중독 같은 지속 피해, 분노·철갑 버프, 약화·상처·오한 디버프, 기절과 추가 드로우·타격·턴·배치 효과를 지원합니다.

일반 전투는 1~4번 고정 슬롯을, 보스전은 5번 보스 슬롯을 사용합니다. 몬스터의 빈 슬롯은 자동으로 당겨지지 않으므로, 단일·좌·우·좌우·전체 범위 공격의 위치 판단도 전략의 일부가 됩니다.

## 데이터와 구현 구조

블록·조합·몬스터·기술 데이터는 Designer가 출력한 JSON을 원본으로 사용하며, 런타임은 `type + parameters.id + value + target` 공통 Effect 규격으로 해석합니다.

- React: 화면, HUD, 공통 메뉴, 모달
- Phaser: 거푸집, 블록 드래그·회전·배치와 전투 연출
- Zustand + Immer: HP, Gold, 덱, 지도 진행과 저장 데이터
- XState: 화면과 전투 진행 흐름
- Howler.js: 공통 사운드 관리
- Vite / Vitest: 빌드와 시스템 테스트

Designer 연동 데이터:

- 블록·조합 데이터: `docs/references/designs/blockable_block_design.json`
- 몬스터 데이터: `docs/references/designs/blockable_monster_design.json`

### Designer 연동

- [Blockable Block Designer](https://github.com/Nyamkani/Blockable_Block_Designer)는 블록의 모양·색상·효과·조합 데이터를 작성해 `blockable_block_design.json`으로 출력합니다.
- [Blockable Monster Designer](https://github.com/Nyamkani/Blockable_Monster_Designer)는 몬스터의 능력치·기술·행동 패턴 데이터를 작성해 `blockable_monster_design.json`으로 출력합니다.

두 JSON은 이 프로젝트의 `docs/references/designs/`에 배치되며, 게임은 이를 검증한 뒤 공통 Effect 해석기와 몬스터 Encounter 생성에 사용합니다. 즉 Designer는 콘텐츠 원본을 만들고, Blockable은 그 데이터를 실제 전투와 화면에 적용합니다.

## 실행 방법

Node.js 설치 후 프로젝트 루트에서 실행합니다.

```bash
npm install
npm run dev
```

검증 명령:

```bash
npm test
npm run lint
npm run build
```

## 주요 문서

- [게임 기획](./docs/BLOCKABLE_GAME_DESIGN.md): 세계관, 진행, 블록, 청사진, 이벤트와 상점
- [전투 시스템](./docs/BLOCKABLE_COMBAT_SYSTEM.md): 피해·상태 효과·Intent·턴 처리 규칙
- [지도 시스템](./docs/BLOCKABLE_MAP_SYSTEM.md): 던전·층·노드·저장·이동 규칙
- [개발 지침](./docs/BLOCKABLE_CODEX_DEVELOPMENT_GUIDE.md): 구조, 상태 소유권, UI·Phaser 경계와 작업 원칙
- [변경 내역](./update.txt)

## 현재 상태

v1.0.0은 메인 화면부터 던전 탐험, 전투, 보상, 이벤트·휴식·상점, 최종 승리와 GameOver까지의 핵심 플레이 흐름을 제공합니다. 일부 Encounter 확정·저장 구조와 장기 콘텐츠 확장은 문서에 향후 작업으로 분리해 관리합니다.
