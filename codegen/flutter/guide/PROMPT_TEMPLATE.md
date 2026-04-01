# PROMPT_TEMPLATE

다음 `flutter_ir.json`을 기반으로 Flutter 코드를 생성하라.

## 역할
- 너는 `flutter_ir`를 Flutter 앱 코드로 변환하는 코드 생성기다.
- 목표는 선택된 일부 노드만 그리는 것이 아니라, IR에 포함된 화면/컴포넌트 그래프를 실행 가능한 Flutter 구조로 완성하는 것이다.
- 기존 프로젝트에 같은 역할의 구조가 이미 있으면 그것을 우선 재사용하거나 확장하고, 없을 때만 기본 가이드를 적용한다.
- 앱 공통 기본값은 `codegen/flutter/guide/FLUTTER_APP_BASELINE.md`를 따른다.
- IR 해석 기본값은 `codegen/flutter/guide/IR_CODEGEN_BASELINE.md`를 따른다.

## 입력 해석 규칙
- `screens[]`는 page/screen root다.
- `components[]`는 재사용 widget root다.
- `interactions[]`는 개별 노드 interaction 인덱스다.
- `flows[]`는 screen-level navigation graph다.
- `node.semantic`과 `node.state`가 있으면 그것이 `v0.2`의 정식 semantic field다.
- `props.componentVariants`가 있으면 `ui_spec` source-of-truth에서 내려온 variant visual/action diff다.
- `props.designInstance`가 있으면 Figma component/variant 원문 메타이며, `runtimeHints` allowlist만 보조 힌트로 참고한다.
- `props.semantic`은 fallback/reference로만 쓴다.
- `interaction.prototype.reactions[].actions[].destinationRootId`는 연결 대상 root다.
- instance의 `props.componentRootId`는 필요한 component 구현 대상을 뜻한다.

## 필수 구현 규칙
- 기본 구현 범위는 `flows.startScreenId` 또는 사용자가 명시한 entry screen 1개와 그 closure다.
- `screens[]` 전체를 자동으로 전부 구현하지 말고, 현재 구현 범위에 직접 필요한 root만 포함하라.
- `components[]`는 현재 구현 범위가 직접 참조하는 root만 closure로 따라 구현하라.
- 특정 screen만 요청되더라도 `destinationRootId`와 `componentRootId`를 따라 필요한 root를 closure로 확장하라.
- route 연결 정보가 있다고 해서 현재 구현 범위 밖의 다른 screen root 전체를 자동 구현 대상으로 승격하지 마라.
- `flows.startScreenId`가 있으면 기본 시작 화면으로 사용하라.
- `interaction.onTap`은 실제 Flutter 이벤트 코드로 구현하라.
- `interaction.navigation.mode`가 있으면 `push`/`replace`/`reset` semantics를 그대로 반영하라.
- `v0.2`의 `toggle` / `select` / `submit` / `openComponent` action type을 generic tap이나 navigate로 뭉개지 마라.
- `v0.2`의 `radio` / `checkbox` / `datePicker` / `textField` / `tab` / `segmentedOption` type을 generic `button` / `text`로 평탄화하지 마라.
- `v0.2`의 `node.state`가 있으면 badge text나 style heuristic보다 우선 반영하라.
- `props.componentVariants`가 있으면 variant별 `surface` / `badge` / `text` / `trailingAction` 차이를 실제 구현에 반영하라.
- `props.componentVariants`는 raw trace 메타가 아니라 source-of-truth visual diff이므로, 존재할 때는 generic theme 색이나 임의 공통 카드 셸로 평균화하지 마라.
- `props.designInstance.runtimeHints`를 참고하더라도 `node.semantic` / `node.state` / interaction보다 우선시키지 마라.
- `props.designInstance.variantProperties`와 `availableVariants` 전체를 앱 상태 머신이나 분기 표로 직접 사용하지 마라.
- `props.designInstance`의 description/component-set description은 trace/reference로만 보고, 그 텍스트만으로 enum/state/API surface를 새로 만들지 마라.
- `interaction.prototype`은 원본 transition/navigation 의도를 잃지 않도록 코드 구조나 주석, helper naming에 반영하라.
- `node.notes.memo`가 있으면 자연어 요구사항으로 해석해 구현에 반영하라.
- 기존 프로젝트에 l10n 구조가 없으면 새 사용자 노출 텍스트는 l10n으로 분리하라.
- 기존 프로젝트에 공통 alert/dialog helper가 없으면 기본 alert util을 먼저 만들고 그것을 사용하라.
- 기존 프로젝트에 별도 shell이 없으면 screen shell은 `Scaffold`의 `appBar`와 `endDrawer`를 우선 사용하라.
- 마지막 route history에서 뒤로가기를 처리할 때 기존 정책이 없으면 종료 확인 alert를 띄우고 `확인` 시 앱 종료를 수행하라.
- 어떤 root도 placeholder, stub, TODO 위젯으로 남기지 마라.
- route가 필요한 경우 앱 라우터까지 포함해라.
- screen과 component를 별도 파일로 분리하라.
- 새 패키지 의존성이 필요하면 가능하면 최신 안정 버전을 사용하되, 기존 프로젝트 제약과 호환성을 우선하라.

## 매핑 규칙
- `navigation=NAVIGATE` -> route 이동
- `interaction.navigation.mode=push` -> `context.push(...)` 또는 동등한 push API
- `interaction.navigation.mode=replace` -> `context.go(...)`, replacement API, 또는 동등한 replace semantics
- `interaction.navigation.mode=reset` -> stack reset 후 지정 route 진입
- `navigation=OVERLAY` -> `showDialog`, `showModalBottomSheet`, custom overlay
- `navigation=SWAP|CHANGE_TO` -> local state/variant 전환
- `navigation=SCROLL_TO` -> `ScrollController` 기반 스크롤 이동
- `gesture.swipe horizontal` -> `PageView`
- `scroll.vertical` -> `ListView` 또는 `SingleChildScrollView`
- `props.componentVariants.variants[*].surface.strokes|fills|effects` -> variant별 card/container shell 차이
- `props.componentVariants.variants[*].badge` -> variant별 badge text/color
- `props.componentVariants.variants[*].text` -> variant별 title/meta text 차이
- `props.componentVariants.variants[*].trailingAction` -> variant별 clear/close/dismiss 보조 affordance

## transition 규칙
- `SMART_ANIMATE` -> `AnimatedSwitcher`, `AnimatedContainer`, `Hero` 등 가장 가까운 Flutter animation
- `DISSOLVE` -> fade 계열
- `MOVE_IN|MOVE_OUT|PUSH|SLIDE_IN|SLIDE_OUT` -> slide/page transition
- transition을 정확히 재현하기 어려워도 type, direction, duration, easing 의도는 버리지 마라.

## 코드 생성 전 필수 단계: 텍스트 매핑 계획

**코드를 작성하기 전에 이 단계를 반드시 먼저 완료하라.**

IR에 포함된 모든 사용자 노출 텍스트를 아래 표로 정리한다.
대상: 헤더, 서브헤더, CTA 버튼 라벨, placeholder, badge, chip label, empty state, 안내 문구 등.

| IR 원문 | 기존 l10n key 후보 | key 실제 값 | 일치 여부 | 처리 방침 |
|--------|------------------|-----------|---------|---------|
| (IR text node 값) | (기존 프로젝트에서 탐색) | (key의 실제 문자열) | ✅ / ❌ | 재사용 / 새 key: `key_name` |

### 일치 여부 판단 기준

- ✅ **재사용 가능**: IR 원문과 key 실제 값이 **글자 단위로 동일**하거나 조사·공백 차이 수준인 경우만 해당
- ❌ **새 key 필요**: 한 글자라도 다르거나, 의미만 유사한 경우 (의미 유사는 재사용 근거가 되지 않는다)
- 헤더·서브헤더·CTA·placeholder·badge는 ✅ 조건을 만족해도 화면 인상에 직접 영향을 주므로 새 key를 우선 검토한다

### 이 단계의 목적

기존 l10n key를 재사용할 때 IR 원문과 key 값이 달라지는 오매핑을 코드 작성 전에 차단한다.
표를 완성하고 처리 방침이 확정된 뒤에만 코드 생성으로 진행한다.

---

## 코드 생성 전 필수 단계: 하단 주요 액션 배치 판단

텍스트 매핑 계획 다음으로, IR의 하단 주요 action/button row를 어떻게 배치할지 먼저 한 줄씩 판단한다.

| 대상 노드/영역 | 후보 역할 | scroll 포함 / 고정 footer | IR 근거 | 결정 이유 |
|--------------|----------|------------------------|---------|---------|
| (예: action_submit_member_register) | bottom CTA | scroll 포함 / 고정 footer | (fixed/sticky field, interaction, prototype, memo, 별도 scroll container, 명확한 band 분리 여부) | (근거 기반 한 줄 설명) |

### 판정 기본값

- `fixed`, `sticky`, `persistent action`, `floating action`, 별도 scroll container 같은 **구조화 근거가 없으면 기본값은 `scroll 포함`** 이다.
- `interaction`, `prototype`, `rule string`, `node.notes.memo`에 고정 action 의도가 없으면 기본값은 `scroll 포함` 이다.
- 하단에 절대 좌표로 배치되어 있어도 위 근거가 없으면 우선 `scroll 포함` 으로 본다.
- 기존 프로젝트에 고정 CTA 패턴이 있더라도, IR 근거가 없으면 그것만으로 `고정 footer`를 선택하지 않는다.
- required notice, section card, privacy/agreement row, CTA/button row가 하나의 세로 폼 흐름이면 기본적으로 모두 같은 scroll 영역 안에 둔다.

### 이 단계의 목적

- 하단 주요 CTA를 임의 재해석하다가 누락하거나 화면 밖으로 밀어내는 실수를 줄인다.
- 근거 없이 `고정 footer`로 내리는 것을 막고, 명시 근거가 없을 때는 body의 단일 vertical scroll content 안에 포함시키도록 강제한다.

### 금지 규칙

- `모바일 UX상 더 자연스럽다`, `항상 보여야 할 것 같다`, `기존 프로젝트가 원래 그렇다` 같은 추론만으로 `고정 footer`를 만들지 마라.
- IR 근거 없이 하단 CTA를 `Scaffold.bottomNavigationBar`, `bottomSheet`, `persistent footer`, `body 밖 하단 영역`으로 내리지 마라.
- `고정 footer`를 선택했다면 어떤 IR 필드/메모/구조가 그 근거인지 반드시 표에 적어라. 적을 수 없으면 잘못된 해석으로 보고 `scroll 포함`으로 되돌려라.
- `고정 footer`를 선택했다면 "왜 body의 단일 scroll content 안에 두지 않았는가"를 한 문장으로 반드시 적어라. 그 문장을 쓰지 못하면 잘못된 해석으로 보고 `scroll 포함`으로 되돌려라.

---

## 출력 형식
- `lib/app.dart`
- `lib/routes/app_router.dart`
- `lib/screens/...`
- `lib/widgets/...`
- 필요한 경우 `lib/widgets/prototype/...`

## 출력 품질 기준
- 코드가 실제로 컴파일 가능한 구조여야 한다.
- import 누락이 없어야 한다.
- 연결된 screen/component가 빠지면 안 된다.
- route 이름과 실제 destination root가 일치해야 한다.
- 같은 component root를 중복 구현하지 마라.

이제 아래 JSON을 읽고, **텍스트 매핑 계획 표를 먼저 작성한 뒤** 전체 Flutter 코드를 생성하라.
