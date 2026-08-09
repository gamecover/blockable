# Blockable

현재 버전: `v0.8.2`

Blockable은 블록을 거푸집에 배치해 공격·방어·회복 효과와 조합식을 발동하는 웹 기반 턴제 로그라이크 게임입니다. 플레이어는 대장장이가 되어 분기형 던전을 탐색하고, 블록 주머니를 관리하며 몬스터와 전투합니다.

## 현재 게임 구성

- 일반 던전: 잿빛 용광로, 침수된 주조장
- 최종 던전: 전체 지도의 중앙 최종 던전
- 일반 모드 난이도: 1 (개발자 모드는 1~10 조절 가능)
- 던전 구성: 난이도에 따라 생성되는 다층 방·양방향 통로 탐험 지도
- 시작 블록: 기본 강철 블록 12개와 선택한 고유 블록 1개
- 손패: 매 턴 기본 5개 드로우
- 배치: 매 턴 최대 3개 블록
- 방 종류: 시작, 전투, 강력, 이벤트, 휴식, 계단, 보스
- 전투 효과: 피해, 방어도, 회복, 상태 효과, 추가 드로우와 블록 조합
- 상태 효과: 출혈, 화상, 약화, 상처, 기절
- 청사진: 3×3 이하 기본 조합과 전투에서 발견한 조합 기록, 전투 중 퀵 조합
- 튜토리얼: 실제 전투 UI를 사용하는 9단계 잉걸불 슬라임 훈련

현재 블록과 몬스터 수치 및 행동은 코드에 중복 작성하지 않고 Designer가 출력한 JSON을 원본으로 사용합니다.

## 전체 데이터 흐름

- Blockable Block Designer: [Nyamkani/Blockable_Block_Designer](https://github.com/Nyamkani/Blockable_Block_Designer)
- Blockable Monster Designer: [Nyamkani/Blockable_Monster_Designer](https://github.com/Nyamkani/Blockable_Monster_Designer)

```text
Blockable Block Designer
→ 블록·조합 블록·색상·효과·범위 공격 등을 설계
→ blockable_block_design.json 출력
                         │
                         ▼
                메인 Blockable 게임
                         ▲
                         │
Blockable Monster Designer
→ 몬스터·어빌리티·행동 패턴·자폭 등을 설계
→ blockable_monster_design.json 출력
```

Designer 애플리케이션은 별도 프로젝트이며, 이 저장소에는 게임이 읽는 결과 JSON과 연동 지침을 보관합니다.

- 블록 디자인 데이터: `docs/references/designs/blockable_block_design.json`
- 몬스터 디자인 데이터: `docs/references/designs/blockable_monster_design.json`
- 블록 연동 지침: `docs/BLOCKABLE_BLOCK_DESIGN_CODEX_INTERACTION_INSTRUCTION.md`
- 몬스터 연동 지침: `docs/BLOCKABLE_MONSTER_DESIGN_CODEX_INTERACTION_INSTRUCTION.md`

## 기술 구성

- React: 화면, HUD, 메뉴와 모달
- Phaser: 전투 거푸집, 블록 표시와 포인터 입력
- Zustand + Immer: 덱, 체력, 골드, 지도 진행도와 저장 데이터
- XState: 앱 화면 흐름과 전투 턴 상태
- Motion: React DOM 애니메이션
- Howler.js: 공통 사운드 관리
- Vite: 개발 서버와 프로덕션 빌드
- Vitest: 게임 시스템 단위 테스트

## 프로젝트 구조

```text
blockable/
├── docs/
│   ├── BLOCKABLE_CODEX_DEVELOPMENT_GUIDE.md
│   ├── BLOCKABLE_GAME_DESIGN.md
│   ├── BLOCKABLE_COMBAT_SYSTEM.md
│   ├── BLOCKABLE_MAP_SYSTEM.md
│   ├── BLOCKABLE_BLOCK_DESIGN_CODEX_INTERACTION_INSTRUCTION.md
│   ├── BLOCKABLE_MONSTER_DESIGN_CODEX_INTERACTION_INSTRUCTION.md
│   └── references/
│       ├── designs/          # Designer가 출력한 블록·몬스터 JSON
│       └── ui/               # 화면 콘셉트 참고 이미지
├── src/
│   ├── app/                  # 최상위 화면 연결
│   ├── assets/               # 공통 폰트, 배경, UI와 블록 텍스처
│   ├── components/           # 공통 메뉴와 재사용 UI
│   ├── config/               # 개발자 모드 등 환경 설정
│   ├── game/
│   │   ├── constants/        # 공통 게임 상수
│   │   ├── events/           # React·Phaser 이벤트 브리지
│   │   ├── machines/         # XState 화면·전투 흐름
│   │   ├── phaser/           # Phaser 설정, Scene과 배치 계산
│   │   ├── state/            # Zustand 실행 상태와 저장
│   │   └── systems/          # 전투, 블록, 조합, 지도와 상태 계산
│   ├── managers/             # 공통 사운드 관리자
│   ├── objects/
│   │   ├── blocks/           # 런타임 블록 생성
│   │   └── monsters/         # 몬스터별 이미지 에셋과 매핑
│   ├── screens/              # 메인, 지도, 전투, 이벤트, 보상 등 화면
│   ├── security/             # 저장 데이터 검증
│   ├── styles/               # 전역 스타일
│   └── main.jsx              # React 진입점
├── AGENTS.md                 # 프로젝트 작업 원칙
├── update.txt                # 버전별 변경 내역
├── package.json
└── vite.config.js
```

`Asset/`, `Assets/`, `assets/` 같은 프로젝트 루트의 임시 반입 폴더는 Git에 포함하지 않습니다. 실제 게임에서 사용하는 에셋은 책임에 따라 `src/assets/`, `src/screens/<screen>/assets/`, `src/objects/monsters/<monster>/assets/`에 배치합니다.

## 실행 방법

Node.js를 설치한 뒤 프로젝트 루트에서 실행합니다.

```bash
npm install
npm run dev
```

터미널에 표시되는 로컬 주소를 브라우저에서 열면 됩니다.

## 검증 명령

```bash
npm test
npm run lint
npm run build
```

## 주요 문서

- 게임 기획: [`docs/BLOCKABLE_GAME_DESIGN.md`](./docs/BLOCKABLE_GAME_DESIGN.md)
- 전투 시스템: [`docs/BLOCKABLE_COMBAT_SYSTEM.md`](./docs/BLOCKABLE_COMBAT_SYSTEM.md)
- 지도 시스템: [`docs/BLOCKABLE_MAP_SYSTEM.md`](./docs/BLOCKABLE_MAP_SYSTEM.md)
- 개발 지침: [`docs/BLOCKABLE_CODEX_DEVELOPMENT_GUIDE.md`](./docs/BLOCKABLE_CODEX_DEVELOPMENT_GUIDE.md)
- 버전별 변경 내역: [`update.txt`](./update.txt)

## 개발 상태

현재는 프로토타입 개발 단계입니다. 난이도에 따른 지도 규모, 경제 밸런스, 일부 버프와 확장 효과의 세부 규칙은 추후 플레이 테스트와 기획 확정에 따라 변경될 수 있습니다.
