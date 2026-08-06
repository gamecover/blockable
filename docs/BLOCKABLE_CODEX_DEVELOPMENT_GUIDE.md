Codex 개발 지침 v0.4

문서 목적
- 이 문서는 게임을 Codex로 개발할 때 따라야 하는 프로젝트 환경, 기술별 책임, 파일 구조 및 코드 작성 규칙을 정의한다.
- 일반 게임 기획 내용과 분리하여 사용한다.
- 가장 중요한 원칙은 메인 파일 하나에 모든 코드를 작성하지 않는 것이다.
- 동일한 상태, 렌더링, 사운드 또는 게임 규칙을 여러 라이브러리가 중복 소유하지 않도록 책임을 명확히 분리한다.
- 각 화면은 배경, 정적 시각 요소, 게임 엔진 동적 요소, React UI 및 Overlay의 렌더링 책임을 구분한다.
- 개발용 편집 화면과 실제 런타임 화면을 분리하며, 편집용 복제 화면을 실제 UI 구현으로 사용하지 않는다.
- 화면별 기본 레이아웃은 하나의 버전 관리된 설정 파일을 유일한 원본으로 사용한다.
- 화면 레이아웃의 공통 논리 기준은 16:9이며, 현재 브라우저의 임의 좌표나 특정 작업 화면 크기를 기준값으로 고정하지 않는다.


0. 프로젝트 환경 및 Codex 개발 규칙

0-1. 개발 환경

- 플랫폼: 웹(Web)
- 애플리케이션 UI: React
- 메인 게임 엔진: Phaser
- 게임은 브라우저에서 실행되는 싱글 플레이 웹 게임으로 제작한다.
- GitHub Pages 등으로 배포하여, 링크 클릭만으로 브라우저에서 바로 플레이할 수 있어야 한다.
- 모든 소스 코드는 프로젝트 루트를 기준으로 관리한다.
- 애플리케이션 소스 코드는 기본적으로 ${PWD}/src/ 아래에 배치한다.
- 개발 언어와 확장자는 프로젝트 생성 시 선택한 JavaScript 또는 TypeScript 중 하나로 통일한다.
- 이 문서의 .js 및 .jsx 파일명은 JavaScript 프로젝트를 기준으로 한 예시다.
- 설치된 라이브러리 버전은 package.json과 lock 파일을 기준으로 하며, Codex가 임의로 메이저 버전을 변경하지 않는다.


0-2. 기술 스택과 책임

1. React / React DOM
- 메인 화면, 지도, 이벤트, 상점, 결과 화면을 구성한다.
- HUD, 메뉴, 버튼, 팝업, 툴팁 및 접근성 UI를 렌더링한다.
- 화면의 정적 프레임, 패널 배경, 장식 이미지 및 고정 시각 요소를 렌더링한다.
- 정적 외형과 그 내부 React UI를 같은 UI Region의 부모·자식 구조로 구성한다.
- CSS Grid와 Flexbox를 사용해 DOM 화면의 배치를 구성한다.
- Phaser가 렌더링하는 인게임 오브젝트를 React DOM으로 중복 렌더링하지 않는다.

2. Phaser
- 인게임 핵심 화면을 Canvas 또는 WebGL로 렌더링하는 메인 게임 엔진이다.
- 실시간 갱신, Canvas 입력, Sprite, Tween, Particle 또는 다수 Game Object 관리가 필요한 동적 요소를 담당한다.
- 정적인 UI 프레임, 패널 배경, 일반 텍스트, 목록, 버튼 및 접근성 UI를 대신 렌더링하지 않는다.
- Phaser Scene의 생성, 시작, 정지 및 해제를 관리한다.
- Phaser 내부 게임 오브젝트를 React state로 매 프레임 복제하지 않는다.

3. Motion for React
- 이전 명칭인 Framer Motion에 해당하는 React UI 애니메이션 라이브러리다.
- React DOM으로 만든 화면 전환, 팝업, 메뉴, HUD 및 버튼 애니메이션에만 사용한다.
- Phaser Canvas 안의 블록, 타일, 몬스터 및 전투 이펙트에는 사용하지 않는다.
- Phaser Canvas 내부 애니메이션은 Phaser Tween 또는 Phaser Animation을 사용한다.

4. Howler.js
- 배경음, 효과음, 음소거 및 볼륨을 담당하는 사운드 시스템이다.
- SoundManager를 통해서만 호출한다.
- Howler.js를 기본 사운드 담당자로 선택한 경우 Phaser 사운드 시스템으로 같은 음원을 중복 재생하지 않는다.
- 브라우저 자동 재생 제한을 고려해 최초 사용자 입력 후 오디오를 활성화한다.

5. Zustand + Immer
- 플레이 중 여러 화면에서 공유해야 하는 게임 데이터를 관리한다.
- 덱, 블록 목록, 체력, 골드, 현재 층, 선택 경로, 설정 및 저장 가능한 런 데이터를 관리한다.
- Immer는 Zustand 상태를 불변성 규칙에 맞게 안전하게 갱신하기 위해 사용한다.
- Phaser의 Sprite, Scene, Tween, Audio 객체와 같은 런타임 인스턴스를 Zustand에 저장하지 않는다.

6. XState
- 게임 진행 절차와 상태 전이를 관리한다.
- 앱 진행, 인카운터 진행, 전투 턴 단계 및 몬스터 행동 State Machine을 정의한다.
- 상태와 이벤트에 따라 다음 단계를 결정하지만 피해량, 회복량 또는 보상량 계산을 직접 중복 구현하지 않는다.
- 실제 수치 계산은 src/game/systems/의 순수 함수 또는 시스템 함수를 호출한다.

7. Custom Hooks
- React와 Zustand, XState, Phaser 사이의 연결을 담당한다.
- 구독 등록, 이벤트 전달, Phaser 생명주기 연결 및 정리 작업을 담당한다.
- 핵심 전투 규칙, 지도 생성 규칙 또는 몬스터 행동 규칙을 Custom Hook 내부에 직접 구현하지 않는다.


0-3. 단일 책임과 단일 소유권 원칙

가장 중요한 명령:

"메인 파일 하나에 모든 코드를 작성하지 마세요."

- App.jsx와 main.jsx에는 전체 애플리케이션을 조립하고 시작하는 최소한의 코드만 작성한다.
- 메인 파일에 전투 규칙, 지도 생성, 블록 계산 또는 몬스터 행동을 직접 구현하지 않는다.
- 메인 파일에서 모든 게임 상태와 에셋 경로를 관리하지 않는다.
- 하나의 데이터에 대해 기준이 되는 원본 상태(Source of Truth)는 하나만 둔다.
- 하나의 시각 요소에 대해 렌더링 주체(Rendering Owner)는 하나만 둔다.
- 같은 게임 규칙을 React, Phaser, Zustand 및 XState에 각각 중복 구현하지 않는다.
- 같은 이미지나 UI를 JSX, CSS background, Phaser Texture 또는 개발용 복제 레이어에서 중복 렌더링하지 않는다.
- 기능과 책임에 따라 파일과 폴더를 분리한다.

상태 소유권 기준:
- 장기 게임 데이터: Zustand + Immer
- 진행 단계와 상태 전이: XState
- 화면에서만 필요한 임시 UI 상태: 해당 React 컴포넌트
- 렌더링 중에만 존재하는 Sprite, Tween 및 Scene 상태: Phaser


0-4. 최상위 실행 구조

App
→ 현재 애플리케이션 화면 선택
→ React Screen 렌더링
→ 필요한 화면 레이어 조립
→ 게임 엔진이 필요한 화면이면 Engine Layer 또는 GameContainer 생성
→ React와 게임 엔진은 Bridge 또는 Event Bus를 통해 통신
→ 화면 종료 시 이벤트 구독, 타이머 및 엔진 인스턴스 해제

화면은 필요에 따라 다음 레이어를 조합한다.

Screen
├── Background Layer
├── Static Visual Layer
├── Engine Dynamic Layer
├── React UI Layer
└── Overlay Layer

- 모든 화면이 다섯 레이어를 반드시 가져야 하는 것은 아니다.
- 해당 화면에서 필요한 레이어만 사용한다.
- 하나의 시각 요소는 하나의 렌더링 레이어만 소유한다.
- 레이어는 렌더링 성격과 책임에 따라 구분하며, 현재 디자인의 특정 오브젝트 이름으로 구분하지 않는다.


0-4-1. 화면 렌더링 책임 분리

1. Background Layer

- 화면 전체 또는 주요 영역의 배경을 렌더링한다.
- 배경 선택과 표시만 담당한다.
- 버튼, 상태값, 게임 규칙 및 상호작용 오브젝트를 포함하지 않는다.

2. Static Visual Layer

화면 실행 중 내용이 자주 변하지 않는 시각 요소를 렌더링한다.

대상 예시:
- 프레임
- 장식 이미지
- 패널 배경
- 구분선
- 고정 배경 요소
- UI의 외형을 구성하는 비상호작용 이미지

규칙:
- 정적 시각 요소는 React DOM 또는 해당 화면에서 정한 단일 렌더링 방식으로 표시한다.
- 같은 이미지를 <img>, CSS background-image, Phaser Texture 등 여러 방식으로 중복 렌더링하지 않는다.
- 정적 시각 요소는 게임 규칙이나 상태의 원본을 소유하지 않는다.
- 게임 입력을 받을 필요가 없다면 pointer-events: none을 사용한다.
- 정적 이미지의 위치와 크기는 화면별 레이아웃 설정을 사용한다.

3. Engine Dynamic Layer

게임 엔진이 필요한 동적·상호작용 요소만 렌더링한다.

대상 판단 기준:
- 매 프레임 위치나 상태가 변한다.
- Canvas 또는 WebGL 렌더링이 필요하다.
- 포인터 드래그, 충돌, 타일 판정 또는 실시간 입력이 필요하다.
- Tween, Particle, Sprite Animation 등 엔진 연출이 필요하다.
- 다수의 게임 오브젝트를 한 공간에서 갱신해야 한다.

규칙:
- Phaser가 담당하는 요소는 React DOM에서 중복 생성하지 않는다.
- 정적인 UI 프레임과 일반적인 DOM 버튼을 Phaser에서 대신 구현하지 않는다.
- Phaser Canvas는 필요한 경우 투명한 동적 레이어로 사용한다.
- Phaser 내부 객체의 위치를 React state로 매 프레임 복제하지 않는다.
- 화면 전체 Canvas를 이동하여 서로 다른 동적 영역을 한꺼번에 맞추지 않는다.
- 독립적으로 배치해야 하는 동적 요소는 의미 있는 그룹이나 Container로 분리한다.

4. React UI Layer

텍스트, 값, 목록, 버튼, 폼 및 접근성 UI를 React DOM으로 렌더링한다.

대상 판단 기준:
- 사용자가 읽어야 하는 텍스트 또는 수치다.
- 버튼, 선택 목록, 모달과 같은 DOM 상호작용이 필요하다.
- 키보드 조작과 접근성 속성이 필요하다.
- CSS Grid, Flexbox 또는 일반 DOM 레이아웃이 적합하다.

규칙:
- React UI는 대응하는 화면 영역을 부모로 사용한다.
- 정적 외형과 그 내부 React UI를 서로 무관한 전역 좌표로 따로 관리하지 않는다.
- 같은 화면 요소를 Phaser와 React에서 동시에 렌더링하지 않는다.
- 복잡한 게임 규칙과 수치 계산을 React 컴포넌트 내부에 작성하지 않는다.

5. Overlay Layer

일반 화면 배치 위에 일시적으로 표시되는 요소를 담당한다.

대상 예시:
- 모달
- 튜토리얼 안내
- 알림
- 디버그 도구
- 개발용 편집 도구
- 화면 전환 연출

규칙:
- Overlay는 일반 화면 레이아웃의 영구 구성요소로 취급하지 않는다.
- Overlay의 표시 여부가 기본 화면의 좌표를 변경하지 않아야 한다.
- 개발용 Overlay를 실제 런타임 화면 구성요소로 재사용하지 않는다.


0-4-2. UI Region 구성 규칙

정적 외형과 그 안에 표시되는 React UI는 하나의 화면 영역으로 구성한다.

권장 구조:

<ScreenUiRegion id="region-id">
  <StaticVisual />
  <UiContent />
</ScreenUiRegion>

또는:

<ScreenUiRegion
  id="region-id"
  backgroundImage={frameImage}
>
  <UiContent />
</ScreenUiRegion>

구조 원칙:

화면 전역 좌표
└── UI Region
    ├── 정적 외형
    └── 내부 React UI

금지 구조:

<LayoutItem id="region-image">
  <img ... />
</LayoutItem>

<LayoutItem id="region-content">
  <UiContent />
</LayoutItem>

- 정적 이미지와 내용을 별도 전역 좌표로 관리하지 않는다.
- UI Region의 위치나 크기가 변경되면 내부 정적 외형과 React UI가 함께 이동하고 비례해야 한다.
- Engine Dynamic Layer는 별도의 투명 렌더링 계층이므로 React UI Region의 자식으로 강제로 넣지 않는다.
- 화면상 같은 위치에 표시해야 한다면 각 레이어가 공식 레이아웃 기준을 사용해 정렬한다.


0-4-3. 화면 파일별 책임

각 화면은 다음 구조를 기본 형태로 사용한다.

src/screens/<screen-name>/
├── <ScreenName>Screen.jsx
├── components/
│   ├── <ScreenName>BackgroundLayer.jsx
│   ├── <ScreenName>StaticVisualLayer.jsx
│   ├── <ScreenName>UiLayer.jsx
│   └── <ScreenName>OverlayLayer.jsx
├── engine/
│   └── <ScreenName>EngineLayer.jsx
├── layout/
│   ├── <screenName>LayoutPreset.js
│   └── <screenName>EngineLayout.js
├── hooks/
├── events/
└── styles/

- 모든 파일을 반드시 생성하라는 의미는 아니다.
- 해당 화면에서 실제로 필요한 책임만 분리한다.

<ScreenName>Screen.jsx
- 화면의 최상위 조립을 담당한다.
- 필요한 상태와 Hook을 호출하고 하위 레이어에 데이터와 이벤트를 전달한다.
- 대량의 정적 이미지 import, 세부 UI 전체 마크업, 엔진 내부 좌표, 복잡한 게임 규칙 및 레이아웃 편집 구현을 동시에 포함하지 않는다.

<ScreenName>StaticVisualLayer.jsx
- 실제 런타임에서 사용하는 정적 외형을 렌더링한다.
- 화면 영역별 정적 이미지 연결을 담당한다.
- 게임 규칙, 상태 원본, 엔진 오브젝트 및 개발용 복제 화면을 소유하지 않는다.

<ScreenName>UiLayer.jsx
- React 기반 텍스트, 값, 목록, 버튼 및 접근성 UI를 조립한다.
- UI Region 내부의 UI 구성을 담당한다.
- 엔진 오브젝트 직접 수정, 별도의 중복 전역 좌표 및 복잡한 도메인 계산을 포함하지 않는다.

<ScreenName>EngineLayer.jsx
- Phaser 또는 선택된 게임 엔진의 마운트, 생명주기, Bridge 연결 및 해제를 담당한다.
- 정적 UI 프레임, React UI 및 장기 게임 상태 원본을 소유하지 않는다.

<ScreenName>OverlayLayer.jsx
- 모달, 튜토리얼, 알림, 디버그 및 개발 도구를 담당한다.
- 기본 화면의 정적 구조를 중복 렌더링하지 않는다.
- Overlay가 꺼졌을 때 사라지는 방식으로 실제 런타임 UI를 구현하지 않는다.


0-4-4. 화면별 레이아웃 단일 원본과 16:9 논리 좌표계

각 화면의 기본 레이아웃은 화면별 설정 파일 하나를 원본으로 사용한다.

권장 파일:

src/screens/<screen-name>/layout/<screenName>LayoutPreset.js

프로젝트의 공통 화면 비율은 16:9로 한다.

- 특정 개발자의 현재 브라우저 크기, 캡처 화면 크기 또는 임시 편집 좌표를 기준 해상도로 사용하지 않는다.
- 공통 논리 해상도는 1920 × 1080을 기본값으로 사용한다.
- 1920 × 1080은 실제 출력 해상도를 제한하는 값이 아니라 레이아웃 계산용 논리 좌표계다.
- 3840 × 2160, 2560 × 1440, 1920 × 1080, 1600 × 900, 1280 × 720처럼 16:9인 실제 해상도는 같은 논리 레이아웃을 균일 배율로 표시한다.
- 2K, 1K 같은 명칭은 환경에 따라 의미가 다를 수 있으므로 코드와 테스트 문서에서는 실제 픽셀 크기를 함께 적는다.

예시:

export const DESIGN_VIEWPORT = Object.freeze({
  width: 1920,
  height: 1080,
  aspectRatio: 16 / 9,
})

export const BASE_LAYOUT = {
  'region-a': {
    x: 0,
    y: 0,
    width: 480,
    height: 135,
  },

  'region-b': {
    x: 480,
    y: 0,
    width: 960,
    height: 135,
  },
}

규칙:
- BASE_LAYOUT의 x, y, width, height는 1920 × 1080 논리 좌표로 기록한다.
- 영역의 실제 의미는 각 화면 구현이 결정한다.
- 지침 문서에는 특정 화면의 영역 이름을 강제하지 않는다.
- 같은 기본 좌표를 JSX, CSS 및 Scene 파일에 각각 복사하지 않는다.
- 정적 외형과 React UI 영역은 같은 배치 ID를 사용한다.
- React 화면 배치와 게임 엔진 내부 배치를 같은 설정 객체에 섞지 않는다.
- 엔진 내부 배치가 필요하면 별도 설정 파일을 사용한다.
- 특정 해상도 전용 좌표 목록을 여러 벌 만들지 않고 하나의 16:9 논리 좌표를 배율 변환한다.

<screenName>LayoutPreset.js
→ 정적 외형과 React UI 영역의 16:9 논리 좌표

<screenName>EngineLayout.js
→ 게임 엔진 내부 동적 그룹의 16:9 논리 좌표


0-4-5. 16:9 반응형 스테이지와 편집 저장 규칙

화면은 현재 브라우저 Viewport 전체를 X축과 Y축으로 각각 늘려 채우지 않는다. 16:9 논리 스테이지를 동일한 배율로 확대 또는 축소하여 중앙에 배치한다.

기본 계산:

const scale = Math.min(
  viewportWidth / DESIGN_VIEWPORT.width,
  viewportHeight / DESIGN_VIEWPORT.height,
)

const stageWidth = DESIGN_VIEWPORT.width * scale
const stageHeight = DESIGN_VIEWPORT.height * scale
const offsetX = (viewportWidth - stageWidth) / 2
const offsetY = (viewportHeight - stageHeight) / 2

const displayX = offsetX + baseX * scale
const displayY = offsetY + baseY * scale
const displayWidth = baseWidth * scale
const displayHeight = baseHeight * scale

규칙:
- X축과 Y축에 서로 다른 배율을 적용하지 않는다.
- 이미지, UI Region, Phaser Canvas 및 포인터 좌표는 같은 scale, offsetX, offsetY를 공유한다.
- 16:9 Viewport에서는 스테이지가 화면을 정확히 채운다.
- Viewport가 16:9보다 넓으면 좌우 여백을 두고 중앙 정렬한다.
- Viewport가 16:9보다 좁거나 세로로 길면 상하 여백을 두고 중앙 정렬한다.
- 별도 화면 요구사항이 없는 한 16:9 스테이지를 잘라내거나 늘여서 채우지 않는다.
- Background Layer가 여백까지 채울 수는 있으나, 실제 UI와 엔진의 논리 스테이지는 16:9를 유지한다.
- 브라우저 resize가 발생할 때 현재 표시 좌표를 다시 기준으로 삼아 누적 확대·축소하지 않는다.
- resize 이벤트만으로 localStorage에 새 좌표를 저장하지 않는다.
- 매 렌더링 시 항상 1920 × 1080 논리 좌표에서 현재 표시 좌표를 계산한다.
- 편집한 화면 좌표는 아래 방식으로 논리 좌표로 역변환하여 저장한다.

baseX = (displayX - offsetX) / scale
baseY = (displayY - offsetY) / scale
baseWidth = displayWidth / scale
baseHeight = displayHeight / scale

- localStorage에는 논리 좌표, 레이아웃 버전 및 필요한 최소 Override만 저장한다.
- 코드에 포함된 LayoutPreset이 정식 기본값이며 localStorage는 개발용 Override다.
- 레이아웃 버전이 다르거나 저장 데이터가 잘못됐으면 localStorage를 무시하고 기본값을 사용한다.
- 배치 초기화는 코드에 정의된 공식 16:9 논리 레이아웃으로 복원해야 한다.
- React DOM과 Phaser가 겹치는 화면에서는 두 계층이 동일한 16:9 스테이지 경계와 좌표 변환을 사용해야 한다.

금지 방식 1:

scaleX = viewportWidth / referenceWidth
scaleY = viewportHeight / referenceHeight

위처럼 X축과 Y축을 독립적으로 확대하면 이미지와 게임 오브젝트의 비율이 달라지므로 사용하지 않는다.

금지 방식 2:

이전 화면 좌표
→ resize 비율 적용
→ 반올림
→ 다시 저장
→ 다음 resize에서 다시 비율 적용

이 방식은 반복할수록 좌표가 변할 수 있으므로 사용하지 않는다.


0-4-6. 레이아웃 편집기와 실제 화면

개발용 레이아웃 편집기는 실제 런타임 구성요소를 편집하는 도구여야 한다.

규칙:
- 편집을 위해 실제 화면과 동일한 이미지를 별도 복제하여 표시하지 않는다.
- 실제 런타임 영역에 편집용 테두리와 핸들을 추가하는 방식으로 구현한다.
- 편집 모드를 꺼도 실제 화면 구성은 그대로 유지되어야 한다.
- 편집기가 화면 요소의 렌더링 주체가 되어서는 안 된다.
- 편집 저장값은 영구 게임 데이터가 아니라 개발용 Override로 취급한다.
- 편집 결과를 확정할 때는 화면별 공식 LayoutPreset에 반영한다.

잘못된 구조:

실제 화면
+ 편집할 때만 나타나는 복제 이미지 화면

올바른 구조:

실제 런타임 화면
+ 편집 중에만 경계선과 조작 핸들


0-5. 화면별 폴더 분리

화면은 기능별로 독립된 폴더를 사용한다.

src/
├── screens/
│   ├── main/
│   ├── map/
│   ├── move/
│   ├── battle/
│   ├── event/
│   ├── shop/
│   └── result/

각 화면 폴더에는 해당 화면에서만 사용하는 요소를 배치한다.
- 화면 컴포넌트
- 하위 React UI 컴포넌트
- 화면 전용 Background, Static Visual, UI 및 Overlay 레이어
- 화면 전용 게임 엔진 연결 레이어
- 화면 전용 UI 이벤트 처리
- 화면 전용 Custom Hook
- 화면별 LayoutPreset과 EngineLayout
- 화면 전용 스타일
- 화면 전용 이미지와 사운드

화면별 폴더는 현재 기능에 필요한 하위 폴더만 만든다.
새 폴더를 형식적으로 모두 생성하지 않는다.


0-6. 전투 화면 폴더 구조

전투 화면도 0-4의 범용 레이어 원칙을 따른다.

권장 구조:

src/screens/battle/
├── BattleScreen.jsx
├── GameContainer.jsx
├── components/
│   ├── BattleBackgroundLayer.jsx
│   ├── BattleStaticVisualLayer.jsx
│   ├── BattleUiLayer.jsx
│   ├── BattleOverlayLayer.jsx
│   └── regions/
├── engine/
│   └── BattleEngineLayer.jsx
├── layout/
│   ├── battleLayoutPreset.js
│   └── battleEngineLayout.js
├── events/
├── hooks/
├── assets/
│   ├── pictures/
│   ├── sounds/
│   └── animations/
└── styles/
    └── battle.css

- BattleScreen.jsx는 전투 상태 Hook과 Background, Static Visual, Engine Dynamic, React UI 및 Overlay 레이어를 조립한다.
- BattleScreen.jsx에 수백 줄의 세부 UI 마크업, 긴 턴 처리 절차, 엔진 좌표 및 레이아웃 편집 로직을 동시에 작성하지 않는다.
- GameContainer.jsx는 Phaser Canvas의 마운트 지점과 생명주기만 관리한다.
- BattleEngineLayer.jsx는 GameContainer와 Bridge 연결을 담당하며 정적 UI를 렌더링하지 않는다.
- Canvas 내부 입력은 Phaser Scene 또는 Phaser 입력 모듈에서 처리한다.
- DOM 입력은 React event handler에서 XState 이벤트 또는 시스템 명령을 전달한다.
- 구체적인 효과, 피해, 보상 및 규칙 계산은 src/game/systems/로 분리한다.
- 정적 외형과 React UI는 같은 UI Region을 사용하고 별개의 전역 좌표로 관리하지 않는다.
- Phaser 내부에서 독립적으로 배치해야 하는 요소는 의미 있는 그룹 또는 Container로 분리한다.


0-7. React와 Phaser 경계

React가 담당하는 영역:
- 화면 구조
- 정적 프레임과 장식 이미지
- HUD, 메뉴, 목록, 버튼, 폼, 팝업 및 툴팁
- 텍스트, 수치 및 접근성 UI
- CSS Grid, Flexbox 및 UI Region 기반 DOM 레이아웃

Phaser가 담당하는 영역:
- 실시간으로 변하는 게임 오브젝트
- Canvas 포인터 입력과 드래그
- Sprite, Tile, Tween, Particle 및 Animation
- 충돌, 타일 판정 및 다수 오브젝트의 실시간 갱신
- Canvas 안에서 발생하는 게임 연출

분류 기준:
- 정적 여부
- 실시간 갱신 여부
- 입력 방식
- Canvas 또는 WebGL 필요 여부
- 키보드 접근성과 DOM 의미 구조 필요 여부

금지 사항:
- 같은 화면 요소를 React DOM과 Phaser Canvas 양쪽에 동시에 생성하지 않는다.
- 같은 정적 이미지를 JSX, CSS background 및 Phaser Texture에서 중복 렌더링하지 않는다.
- React가 Phaser Sprite의 위치를 매 프레임 state로 갱신하지 않는다.
- Phaser Scene에서 React DOM을 직접 조작하지 않는다.
- React 컴포넌트가 Phaser Scene 내부 객체를 직접 수정하지 않는다.
- 개발용 복제 레이어를 실제 런타임 렌더링 구현으로 사용하지 않는다.
- 전체 Phaser Canvas를 이동하여 서로 다른 내부 동적 그룹의 배치를 한꺼번에 맞추지 않는다.

연결 방식:
- React와 Phaser는 명시적인 Bridge 또는 Event Bus를 통해 통신한다.
- 이벤트 이름과 payload 구조는 src/game/events/에 정의한다.
- React는 Phaser에 명령이나 초기 데이터를 전달하고, Phaser는 결과 이벤트를 전달한다.
- 화면을 떠날 때 이벤트 구독과 Phaser 인스턴스를 반드시 해제한다.


0-8. 에셋과 사운드 관리

에셋 기본 위치:
- 한 화면 전용: 해당 화면의 assets
- 특정 몬스터 전용: 해당 몬스터 폴더의 assets
- 여러 화면 공용: ${PWD}/src/assets/

메인 화면 배경 예시:
${PWD}/src/screens/main/assets/pictures/target_picture.png

공용 에셋 구조:

src/assets/
├── pictures/
├── sprites/
├── icons/
├── sounds/
├── animations/
└── manifests/

에셋 사용 규칙:
- 소스 코드에서 ${PWD}를 런타임 URL로 사용하지 않는다.
- 번들러가 처리할 수 있도록 import 또는 프로젝트에서 정한 에셋 URL 규칙을 사용한다.
- Phaser가 필요한 에셋은 Scene preload 단계 또는 공용 AssetManager에서 로드한다.
- 같은 에셋 키를 서로 다른 파일에 중복 등록하지 않는다.
- 에셋 키와 경로는 manifest 또는 constants에서 관리한다.
- 에셋 로딩 실패 시 대체 이미지 또는 오류 처리를 제공한다.

사운드 규칙:
- Howler.js를 사용하는 SoundManager를 사운드의 단일 진입점으로 사용한다.
- React 컴포넌트와 Phaser Scene에서 new Howl을 직접 반복 생성하지 않는다.
- 배경음, 효과음, UI 사운드 및 음량 그룹을 구분한다.
- 화면 전환 또는 Scene 종료 시 불필요한 사운드를 정지하거나 해제한다.


0-9. 이벤트 처리 코드 분리

- UI 컴포넌트에는 복잡한 게임 규칙을 직접 작성하지 않는다.
- UI 컴포넌트와 Phaser 입력 처리는 명령 또는 이벤트를 전달한다.
- XState가 현재 진행 상태에서 이벤트를 받을 수 있는지 판단한다.
- 실제 계산은 game/systems를 호출한다.
- 계산 결과는 해당 상태 소유자에게 반영한다.

턴 종료 처리 예시:

사용자가 턴 종료 버튼 클릭
→ React handler가 END_TURN 이벤트 전송
→ XState가 현재 상태에서 END_TURN 허용 여부 확인
→ 블록 및 세트 효과 계산 시스템 호출
→ Zustand의 전투 데이터 갱신
→ 몬스터 State Machine에 행동 결정 이벤트 전달
→ Phaser에 연출 명령 전달
→ 연출 완료 이벤트 수신
→ XState가 다음 턴 상태로 전환
→ React HUD와 Phaser 화면 갱신

화면별 UI 이벤트 위치:
- 전투 화면: ${PWD}/src/screens/battle/events/
- 지도 화면: ${PWD}/src/screens/map/events/
- 일반 이벤트 화면: ${PWD}/src/screens/event/events/

공용 도메인 이벤트 정의:
- ${PWD}/src/game/events/

공용 게임 규칙:
- ${PWD}/src/game/systems/


0-10. 게임 객체 관리

src/objects/
├── monsters/
├── blocks/
├── items/
└── relics/

몬스터 구조 예시:

src/objects/monsters/
├── fireSpirit/
│   ├── fireSpiritData.js
│   ├── fireSpiritMachine.js
│   ├── fireSpiritActions.js
│   ├── fireSpiritSprite.js
│   └── assets/
├── mimic/
│   ├── mimicData.js
│   ├── mimicMachine.js
│   ├── mimicActions.js
│   ├── mimicSprite.js
│   └── assets/
└── voidMonster/
    ├── voidMonsterData.js
    ├── voidMonsterMachine.js
    ├── voidMonsterActions.js
    ├── voidMonsterSprite.js
    └── assets/

각 몬스터 폴더의 책임:
- Data: 기본 능력치와 정적 설정
- Machine: XState 상태, 전환, guard 및 행동 선택 규칙
- Actions: 해당 몬스터 고유 행동 정의
- Sprite: Phaser 표시와 애니메이션 연결
- Assets: 해당 몬스터 전용 리소스

- 몬스터가 Phaser에서 렌더링된다면 FireSpirit.jsx와 같은 React 표시 컴포넌트를 기본으로 만들지 않는다.
- React가 필요한 도감, 툴팁 또는 상세 UI는 별도의 React UI 컴포넌트로 작성한다.
- 몬스터 데이터, 상태 전이, 수치 계산 및 화면 표시를 한 파일에 합치지 않는다.


0-11. XState 기반 State Machine

- 게임 진행과 몬스터 행동 State Machine은 XState를 사용해 구현한다.
- XState를 사용하는 경우 StateMachine.js, State.js, Transition.js 같은 자체 범용 엔진을 다시 만들지 않는다.
- 단순 데이터와 React 화면 컴포넌트에는 State Machine을 적용하지 않는다.
- 몬스터는 규칙 기반 조건과 확률을 조합해 행동한다.
- 몬스터의 현재 상태, 이전 행동 및 필요한 전투 정보를 이용해 다음 행동을 결정한다.

몬스터 행동 정의의 핵심 요소:

1. 패턴과 확률의 조합
- 반드시 실행해야 하는 규칙을 확률 판단보다 먼저 검사한다.
- 강제 규칙이 없을 때만 확률에 따라 행동 후보를 선택한다.

2. 연속 행동 제한
- 이전 행동, 연속 사용 횟수 및 재사용 대기 상태를 확인한다.
- 금지된 행동이 다시 선택되면 허용된 다른 행동 또는 기본 행동으로 대체한다.

3. 플레이어 및 전투 상태 반응
- 플레이어 체력, 방어도, 상태 이상 및 이전 행동을 조건으로 사용할 수 있다.
- 몬스터 자신의 체력, 버프, 디버프, 동료의 상태와 행동 순서도 조건으로 사용할 수 있다.

4. 상태 전환
- 현재 상태와 수신한 이벤트에 따라 다음 상태를 결정한다.
- 상태 예시: 시작, 준비, 공격, 방어, 회복, 특수 행동, 행동 불가, 사망.

행동 패턴 예시:

순차적 규칙형
시작
→ 첫 턴 버프
→ 공격 상태로 전환
→ 이후 공격 반복

상태 및 동기화형
몬스터 A 준비
→ 몬스터 B 공격
→ 몬스터 A 특수 행동
→ 두 몬스터 상태 갱신

확률형
강제 규칙 검사
→ 난수 생성
→ 확률에 따른 행동 후보 선택
→ 연속 사용 제한 검사
→ 플레이어 및 몬스터 상태 검사
→ 최종 행동 결정
→ 이전 행동과 다음 상태 갱신

공통 Machine 구조:

src/game/machines/
├── appMachine.js
├── encounterMachine.js
├── battleTurnMachine.js
├── shared/
│   ├── guards.js
│   ├── actions.js
│   └── events.js
└── tests/

- 개별 몬스터 Machine은 각 몬스터 폴더에 둔다.
- 공통 guard, action 및 event 정의만 src/game/machines/shared/에서 재사용한다.
- 몬스터 Machine이 피해 계산을 직접 구현하지 않고 game/systems를 호출한다.
- 확률형 행동을 테스트할 수 있도록 난수 함수는 외부에서 주입하거나 고정 가능한 형태로 작성한다.


0-12. 게임 상태와 데이터

Zustand + Immer가 관리하는 데이터 예시:
- 현재 런 정보
- 현재 층과 선택 경로
- 플레이어 체력과 골드
- 덱, 손패, 버림 더미 및 남은 블록
- 획득한 아이템과 유물
- 게임 설정
- 저장 가능한 진행 데이터

XState가 관리하는 상태 예시:
- 현재 애플리케이션 단계
- 지도 선택 가능 여부
- 인카운터 시작, 진행, 보상 및 종료 단계
- 플레이어 입력 대기, 효과 계산, 몬스터 행동, 연출 대기 및 다음 턴 단계
- 몬스터의 행동 상태와 전이

Phaser가 관리하는 임시 상태 예시:
- Sprite와 Game Object 인스턴스
- Tween 진행 상태
- 포인터 드래그 중인 좌표
- 파티클과 일시적인 연출 객체

금지 사항:
- 동일한 체력이나 골드를 Zustand와 XState context 양쪽에서 각각 원본으로 관리하지 않는다.
- Phaser 객체를 Zustand에 저장하지 않는다.
- React state를 영구 게임 저장소로 사용하지 않는다.
- 상태를 수정할 수 있는 공식 action 또는 event를 우회해 직접 변경하지 않는다.


0-13. 공용 게임 시스템

src/game/
├── phaser/
│   ├── config/
│   ├── scenes/
│   ├── input/
│   └── bridge/
├── systems/
│   ├── battleSystem.js
│   ├── damageSystem.js
│   ├── defenseSystem.js
│   ├── healingSystem.js
│   ├── deckSystem.js
│   ├── blockEffectSystem.js
│   ├── shapeBonusSystem.js
│   ├── rewardSystem.js
│   └── mapGenerationSystem.js
├── machines/
├── state/
├── events/
├── constants/
└── utils/

폴더별 책임:
- game/phaser: Phaser 설정, Scene, Canvas 입력 및 React 연결
- game/systems: 화면과 엔진에 독립적인 게임 규칙과 계산
- game/machines: XState 기반 진행 State Machine
- game/state: Zustand store와 데이터 갱신 action
- game/events: 시스템 사이에서 사용하는 이벤트 이름과 payload 규격
- game/constants: 고정 수치와 열거형
- game/utils: 여러 영역에서 공통 사용하는 작은 보조 함수

시스템 함수 작성 원칙:
- 입력값과 반환값을 명확히 한다.
- 가능한 한 React, Phaser 및 DOM에 의존하지 않는 순수 함수로 작성한다.
- 난수에 의존하는 함수는 테스트에서 난수를 통제할 수 있도록 한다.
- 시스템 함수 안에서 화면을 직접 조작하지 않는다.


0-14. 보안 및 신뢰성

1. 프론트엔드 비밀정보 금지
- API 키, 비밀번호, 관리자 토큰 및 비밀값을 React 코드나 번들에 포함하지 않는다.
- 환경 변수 이름에 숨겨도 브라우저에 전달된 값은 비밀이 아니다.
- 비밀값이 필요한 기능은 별도 서버에서 처리한다.

2. 사용자 입력과 저장 데이터 검증
- 이름, 저장 파일, URL parameter 및 localStorage 데이터는 신뢰하지 않는다.
- JSON 구조, 자료형, 범위 및 허용된 열거값을 검사한 뒤 사용한다.
- 잘못된 저장 데이터는 안전한 기본값으로 복구하거나 불러오기를 거부한다.

3. XSS 방지
- 사용자 입력을 HTML로 직접 삽입하지 않는다.
- dangerouslySetInnerHTML을 사용하지 않는다. 반드시 필요하면 검증된 정화 절차를 거친다.
- eval, new Function 및 문자열 기반 코드 실행을 사용하지 않는다.

4. 의존성 관리
- package-lock.json 또는 선택한 패키지 관리자의 lock 파일을 저장소에 포함한다.
- Codex가 요청 없이 패키지를 추가하거나 메이저 버전을 변경하지 않는다.
- 설치 전 패키지의 이름, 공식 배포처 및 필요성을 확인한다.
- 정기적으로 알려진 취약점과 사용하지 않는 의존성을 점검한다.

5. 리소스 경로와 네트워크
- 사용자 입력을 그대로 이미지, 사운드 또는 외부 스크립트 URL로 사용하지 않는다.
- 허용된 로컬 에셋과 신뢰할 수 있는 출처만 로드한다.
- 가능하면 배포 환경에 Content Security Policy를 설정한다.
- 외부 요청 실패, 지연 및 잘못된 응답을 처리한다.

6. 랭킹과 점수
- 브라우저에서 계산한 점수와 클리어 기록은 사용자가 조작할 수 있다고 가정한다.
- 로컬 랭킹은 재미 요소로만 사용한다.
- 신뢰 가능한 온라인 랭킹이 필요하면 서버가 점수와 플레이 결과를 검증해야 한다.

7. 안정성
- React Error Boundary와 Phaser Scene 오류 처리를 구분한다.
- 화면 이동 시 타이머, 이벤트 구독, XState actor, Howler 사운드 및 Phaser 인스턴스를 정리한다.
- 저장 중 오류가 발생해도 기존 저장 데이터를 즉시 덮어쓰지 않는다.
- 개발 모드에서는 오류 원인을 기록하되 사용자 데이터나 비밀값을 로그로 남기지 않는다.


0-15. 배포 및 브라우저 실행

- 프로젝트는 정적 웹 호스팅으로 배포할 수 있어야 한다.
- GitHub Pages 등을 이용해 별도의 프로그램 설치 없이 공개 링크만으로 게임을 실행할 수 있어야 한다.
- 기본 배포 결과물은 정적 HTML, JavaScript, CSS 및 에셋 파일로 구성한다.
- 백엔드가 필요한 기능을 추가하지 않는 한 게임의 기본 실행이 별도 서버 API에 의존하지 않도록 한다.
- 배포 경로가 도메인 루트가 아닌 하위 경로일 수 있음을 고려한다.
- 이미지, 사운드, 스프라이트 및 번들 경로를 절대 루트 경로로 하드코딩하지 않는다.
- 사용하는 빌드 도구에서 base path 또는 public path를 배포 환경에 맞게 설정한다.
- SPA 라우팅을 사용할 경우 GitHub Pages에서 새로고침이나 직접 URL 접근 시 404가 발생하지 않도록 HashRouter 또는 적절한 fallback 방식을 사용한다.
- 배포용 빌드가 성공해도 로컬 개발 서버에서만 동작하는 경로가 남아 있지 않은지 확인한다.
- 배포 후 실제 공개 URL에서 메인 화면, 화면 이동, Phaser Canvas, 이미지, 사운드 및 저장 기능을 확인한다.
- Codex는 배포 설정을 수정할 때 기존 배포 방식과 package.json의 scripts를 먼저 확인한다.
- 요청받지 않은 호스팅 서비스 변경, 도메인 변경 또는 유료 서비스 도입을 진행하지 않는다.


0-16. 테스트 및 검증

- game/systems의 전투, 덱 순환, 블록 효과, 보상 및 지도 생성 규칙을 단위 테스트한다.
- XState Machine의 주요 상태 전이와 허용되지 않는 이벤트를 테스트한다.
- 몬스터의 순차형, 동기화형, 확률형 패턴을 테스트한다.
- 확률형 테스트에서는 고정 난수 또는 주입한 난수 함수를 사용한다.
- React와 Phaser Bridge의 이벤트 구독 및 해제를 확인한다.
- 화면을 반복해서 열고 닫았을 때 Phaser Canvas, 이벤트 리스너 및 사운드가 중복 생성되지 않는지 확인한다.
- 레이아웃 화면은 최소 3840 × 2160, 2560 × 1440, 1920 × 1080, 1280 × 720에서 비율, 정렬 및 입력 좌표를 확인한다.
- 16:9가 아닌 브라우저 Viewport에서도 스테이지가 왜곡되지 않고 중앙 정렬되며 여백 처리되는지 확인한다.
- React UI와 Phaser가 겹치는 화면은 해상도 변경 후에도 시각 위치와 포인터 입력 위치가 일치하는지 확인한다.
- 코드 변경 후 lint, test 및 build를 실행한다.
- 배포 설정이나 에셋 경로를 변경한 경우 production build와 정적 배포 경로를 확인한다.
- 기존 기능과 관련 없는 실패가 있으면 숨기지 말고 구분해 보고한다.


0-17. Codex 코드 작성 규칙

Codex는 코드를 생성하거나 수정할 때 다음 원칙을 따라야 한다.

1. 작업 전에 기존 폴더 구조, package.json, lock 파일 및 관련 코드를 먼저 확인한다.
2. App.jsx, main.jsx 또는 하나의 Scene 파일에 모든 기능을 구현하지 않는다.
3. React, Phaser, Zustand, XState 및 Howler.js의 책임 경계를 지킨다.
4. 같은 역할을 하는 코드가 있다면 중복 구현하지 않는다.
5. 하나의 파일은 가능한 한 하나의 주요 책임만 가진다.
6. React 컴포넌트 안에 복잡한 전투 계산이나 지도 생성 코드를 직접 작성하지 않는다.
7. Phaser Scene 안에 영구 게임 데이터와 전체 전투 규칙을 직접 저장하지 않는다.
8. 화면 전용 코드는 해당 화면 폴더에 작성한다.
9. 공용 게임 규칙은 src/game/systems/에 작성한다.
10. 진행 단계와 상태 전이는 XState Machine으로 작성한다.
11. 공유 게임 데이터는 Zustand action을 통해 변경한다.
12. 몬스터별 데이터와 행동 Machine은 해당 몬스터 폴더에 작성한다.
13. XState를 사용하면서 별도의 범용 State Machine 엔진을 중복 제작하지 않는다.
14. Motion for React를 Phaser Canvas 내부 애니메이션에 사용하지 않는다.
15. Phaser Tween을 React DOM UI 애니메이션에 사용하지 않는다.
16. 사운드는 SoundManager를 통해 Howler.js로 재생한다.
17. 이미지, 사운드 및 애니메이션은 용도에 맞는 assets 폴더에 배치한다.
18. 소스 코드에서 ${PWD}를 런타임 에셋 URL로 사용하지 않는다.
19. 새로운 패키지나 폴더를 임의로 추가하기 전에 기존 구조에서 해결 가능한지 확인한다.
20. 요청받지 않은 전체 리팩터링이나 라이브러리 교체를 진행하지 않는다.
21. 임시 코드, 사용하지 않는 코드 및 중복 코드를 남기지 않는다.
22. 코드 변경 후 import 경로, lint, test, build 및 기존 화면 동작을 확인한다.
23. 테스트하지 못한 항목과 남은 한계는 완료 결과에 명시한다.
24. GitHub Pages 같은 정적 호스팅의 하위 경로에서도 에셋과 화면 이동이 정상 동작하도록 한다.
25. 배포 관련 변경 후 가능하면 실제 배포 URL 또는 정적 미리보기에서 게임 실행을 확인한다.
26. 화면 구현 또는 수정 전에 각 시각 요소의 렌더링 소유자를 Background, Static Visual, Engine Dynamic, React UI, Overlay 중 하나로 지정한다.
27. 특정 요소를 현재 디자인 이름만으로 분류하지 말고 정적 여부, 실시간 갱신 여부, 입력 방식 및 접근성 필요 여부를 기준으로 렌더링 계층을 결정한다.
28. 같은 요소를 React JSX, CSS background, Phaser Texture 또는 개발용 복제 레이어 중 두 곳 이상에서 렌더링하지 않는다.
29. Screen 컴포넌트는 레이어와 하위 컴포넌트를 조립하며 세부 UI 전체, 엔진 좌표, 복잡한 게임 규칙 및 개발 도구를 동시에 소유하지 않는다.
30. 정적 외형과 그 내부 React UI는 같은 UI Region에 속하게 하며 서로 독립된 전역 좌표로 관리하지 않는다.
31. 게임 엔진은 동적으로 변하거나 엔진 입력 및 실시간 연출이 필요한 요소만 렌더링한다.
32. 일반 텍스트, 목록, 버튼, 폼 및 접근성 UI를 게임 엔진으로 대체하지 않는다.
33. 개발용 편집 화면을 실제 런타임 화면의 렌더링 구현으로 사용하지 않는다.
34. 각 화면의 기본 레이아웃은 화면별 LayoutPreset 파일 하나를 유일한 원본으로 사용하며, 기본 논리 좌표계는 1920 × 1080의 16:9로 한다.
35. React 영역 좌표와 게임 엔진 내부 좌표를 같은 레이아웃 객체에 혼합하지 않되, 두 계층은 같은 16:9 스테이지 변환 규칙을 사용한다.
36. 브라우저 크기 변경 시 X축과 Y축을 따로 늘리지 말고 단일 scale과 중앙 offset을 사용해 16:9 비율을 유지한다.
37. 현재 표시값을 반복 변환하거나 resize 이벤트만으로 편집 좌표를 localStorage에 자동 저장하지 않는다. 편집 결과는 1920 × 1080 논리 좌표로 역변환하여 저장한다.
38. 새 기능이 기존 파일의 주요 책임과 다르면 해당 책임의 컴포넌트, Hook, System 또는 Engine Helper로 분리한다.
39. 하나의 파일이 상태 처리, 렌더링, 레이아웃 편집, 게임 규칙 및 엔진 입력 중 둘 이상의 큰 책임을 소유하면 작업 전에 분리 계획을 제시한다.
40. 구조 변경 전에 현재 파일별 책임, 중복 렌더링 요소, 수정할 파일 및 변경 후 책임을 먼저 보고한다.


0-18. 전체 권장 구조

src/
├── app/
│   ├── App.jsx
│   └── providers/
├── assets/
│   ├── pictures/
│   ├── sprites/
│   ├── icons/
│   ├── sounds/
│   ├── animations/
│   └── manifests/
├── components/
│   └── ui/
├── screens/
│   ├── main/
│   ├── map/
│   ├── move/
│   ├── battle/
│   ├── event/
│   ├── shop/
│   └── result/
│       ├── <ScreenName>Screen.jsx
│       ├── components/
│       ├── engine/
│       ├── layout/
│       ├── hooks/
│       ├── events/
│       └── styles/
├── objects/
│   ├── monsters/
│   ├── blocks/
│   ├── items/
│   └── relics/
├── game/
│   ├── phaser/
│   │   ├── config/
│   │   ├── scenes/
│   │   ├── input/
│   │   └── bridge/
│   ├── systems/
│   ├── machines/
│   ├── state/
│   ├── events/
│   ├── constants/
│   └── utils/
├── managers/
│   ├── AssetManager.js
│   └── SoundManager.js
├── hooks/
├── security/
│   └── validation/
└── main.jsx

- screens 아래의 하위 구조는 예시이며, 각 화면에 필요한 폴더만 만든다.
- 화면별 LayoutPreset과 EngineLayout을 분리하여 React 영역 좌표와 엔진 내부 좌표를 혼합하지 않는다.


0-19. 최종 핵심 명령

"메인 파일이나 하나의 Phaser Scene에 모든 코드를 생성하지 마세요. React는 화면 구조, 정적 시각 요소, UI Region, HUD, 메뉴 및 접근성 UI를 담당하고, Phaser는 실시간 갱신·Canvas 입력·Sprite·Tween·Particle이 필요한 동적 게임 요소를 담당합니다. 하나의 시각 요소는 하나의 렌더링 계층만 소유해야 하며 React JSX, CSS background, Phaser Texture 또는 개발용 복제 레이어에서 중복 렌더링하지 마세요. 정적 외형과 그 내부 React UI는 같은 UI Region 안에서 부모·자식으로 구성하고 서로 독립된 전역 좌표로 관리하지 마세요. 각 화면의 기본 레이아웃은 하나의 버전 관리된 LayoutPreset 파일을 유일한 원본으로 사용하고, 1920 × 1080의 16:9 논리 좌표계를 기준으로 관리하세요. React 화면 좌표와 게임 엔진 내부 좌표는 별도 설정으로 관리하되 같은 16:9 스테이지 변환을 사용해야 합니다. 브라우저 resize 시 X축과 Y축을 독립적으로 늘리거나 현재 표시 좌표를 누적 변환·자동 저장하지 말고, 단일 배율과 중앙 오프셋으로 논리 좌표에서 현재 좌표를 계산하세요. Zustand + Immer는 공유 게임 데이터를, XState는 진행 단계와 상태 전이를, Howler.js는 사운드를 담당합니다. Motion for React는 React DOM 애니메이션에만 사용하고 Phaser Canvas 애니메이션은 Phaser Tween 또는 Animation으로 구현하세요. 실제 게임 규칙과 계산은 src/game/systems/에 분리하고, 각 시스템 사이의 통신은 명시적인 event와 bridge를 통해 처리하세요. 기존 구조와 의존성을 먼저 확인하고, 구조 변경 전 현재 파일별 책임과 분리 계획을 제시한 뒤 최소 범위로 수정하며 lint, test, production build 및 배포 경로를 검증하세요."


부록 A. 핵심 기술 역할 요약

- React DOM + CSS Grid/Flexbox: 화면 구조, 정적 시각 요소, UI Region, HUD, 메뉴, 목록, 버튼 및 오버레이
- Phaser: 실시간 게임 오브젝트, Canvas 입력, 스프라이트, 타일, Tween, Particle 및 인게임 이펙트
- Motion for React: React DOM 화면 전환과 UI 애니메이션
- Howler.js: 배경음과 효과음
- Zustand + Immer: 공유 게임 데이터와 불변 상태 갱신
- XState: 게임 흐름, 턴 제어, 몬스터 행동 State Machine
- Custom Hooks: React와 각 시스템의 연결 및 생명주기 정리
- AssetManager: 에셋 키, 경로, 로딩 및 재사용
- SoundManager: 사운드 생성, 재생, 정지, 그룹 음량 및 해제
- 정적 웹 배포: GitHub Pages 등의 링크를 통해 설치 없이 브라우저에서 즉시 실행


부록 B. 검토 과정에서 수정한 항목

- 'Famer Motionr'를 현재 명칭인 'Motion for React'로 수정했다.
- 중복 기재된 'React DOM (CSS Grid / Flexbox)' 항목을 하나로 통합했다.
- React DOM과 Phaser가 같은 게임 화면을 중복 렌더링하지 않도록 영역을 분리했다.
- Motion for React는 DOM 애니메이션, Phaser Tween은 Canvas 애니메이션으로 구분했다.
- Zustand는 공유 데이터, XState는 흐름과 상태 전이로 역할을 분리했다.
- XState를 사용하므로 자체 범용 State Machine 엔진을 다시 만드는 구조를 제거했다.
- Howler.js와 Phaser 사운드 시스템의 중복 사용을 금지하고 Howler.js를 기본 사운드 담당자로 정했다.
- Custom Hook을 핵심 게임 로직 계층이 아니라 연결 계층으로 수정했다.
- 브라우저 게임의 저장 데이터, XSS, 의존성, 에셋 URL 및 온라인 랭킹에 관한 보안 지침을 추가했다.
- GitHub Pages 등의 정적 웹 호스팅 배포와 하위 경로, SPA 라우팅 및 실제 공개 URL 검증 규칙을 추가했다.
- 화면 렌더링을 Background, Static Visual, Engine Dynamic, React UI 및 Overlay 레이어로 분리했다.
- 모든 화면이 동일한 레이어를 강제로 사용하지 않고 필요한 레이어만 조합하도록 수정했다.
- 정적 외형과 내부 React UI를 하나의 UI Region으로 구성하도록 규정했다.
- 같은 요소를 JSX, CSS background, Phaser Texture 및 개발용 복제 레이어에서 중복 렌더링하지 않도록 규정했다.
- 화면별 LayoutPreset과 게임 엔진 내부 EngineLayout을 분리했다.
- resize 때 표시 좌표를 누적 변환하거나 localStorage에 자동 저장하는 방식을 금지했다.
- 개발용 레이아웃 편집기는 실제 런타임 화면에 핸들만 추가하고 별도 복제 화면을 만들지 않도록 규정했다.
- Screen 컴포넌트와 Phaser Scene에 여러 큰 책임이 누적될 경우 작업 전 분리 계획을 먼저 제시하도록 Codex 규칙을 강화했다.
- 특정 작업 브라우저의 2268 × 1080 좌표를 기준값으로 사용하지 않고, 공통 논리 해상도를 1920 × 1080의 16:9로 변경했다.
- 4K, QHD, FHD, HD 등 16:9 해상도는 단일 배율로 확대·축소하고, 비16:9 Viewport에서는 레터박스 또는 필러박스로 중앙 정렬하도록 규정했다.
- X축과 Y축의 독립 배율 적용을 금지하고 React UI와 Phaser가 동일한 스테이지 배율 및 오프셋을 공유하도록 규정했다.




