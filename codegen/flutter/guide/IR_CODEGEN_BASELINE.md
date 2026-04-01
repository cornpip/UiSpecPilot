# IR_CODEGEN_BASELINE

`flutter_ir.json`을 Flutter 코드로 해석할 때 적용하는 입력 해석 기본 가이드.

## Top Rule
- 이 문서는 `flutter_ir`를 어떻게 읽고 어떤 우선순위로 코드 구조에 반영할지 정의한다.
- 앱 전반 구조, 공통 유틸, l10n, shell, 종료 UX 같은 정책은 [`FLUTTER_APP_BASELINE.md`](./FLUTTER_APP_BASELINE.md) 를 따른다.
- 즉, 이 문서는 IR 해석 baseline이고, 앱 구조 baseline은 별도다.

## Core Inputs
- `screens[]`: screen/page root
- `components[]`: 재사용 widget root
- `interactions[]`: 개별 노드 interaction 인덱스
- `flows[]`: screen-level navigation graph
- `node.semantic`: `v0.2`에서 승격된 node semantic snapshot
- `node.state`: `v0.2`에서 승격된 selected/checked/default/active state
- `node.props.componentVariants`: `ui_spec` source-of-truth variant visual/action diff
- `node.props.designInstance`: Figma component/variant 원문 메타와 제한적 runtime hint
- `node.notes.memo`: 디자이너 자연어 메모
- `node.type`과 child `style.x/y/width/height`: layout intent 해석 입력
- `style.fills`, `style.strokes`, check badge, short status text: selected/default state 해석 입력

## Interpretation Priority
1. `flows[]`, `destinationRootId`, `componentRootId` 같은 구조화 참조
2. `interaction.navigation.mode`, `interaction.onTap`, `interaction.scroll`, `interaction.gesture`, `interaction.prototype`
3. `node.type`, `node.semantic`, `node.state` 같은 정식 semantic field
4. `props.componentVariants` 같은 source-of-truth visual/action diff
5. `props.designInstance.runtimeHints` 같은 제한적 design-system hint
6. `props.semantic`, `node.notes.memo`
7. 위 정보로 결정되지 않는 항목만 앱 baseline fallback 적용

## Version Awareness
- `flutter_ir v0.1`과 `v0.2`를 모두 읽을 수 있어야 한다.
- `v0.2`에 정식 field가 있으면 그것을 우선 신뢰한다.
- `v0.1`만 있거나 `v0.2`에서도 정식 field가 비어 있으면 `props.semantic`과 `node.notes.memo`를 fallback으로 사용한다.
- `props.componentVariants`가 있으면 semantic/state를 대체하지는 않지만, variant별 stroke/fill/effect/badge/trailing action 차이에 대해서는 source-of-truth visual diff로 취급한다.
- `props.designInstance`는 component/variant 원문 보존용이며, `runtimeHints`에 allowlist로 승격된 값만 보조 입력으로 사용한다.
- 즉, 해석 순서는 `정식 field -> componentVariants -> designInstance.runtimeHints -> props.semantic -> memo` 다.
- `props.designInstance` 안의 variant 목록, 설명 텍스트, component set 메타는 trace/reference 레이어로만 보고, 정식 semantic/state가 없는 의미를 codegen이 새로 발명하는 근거로 삼지 않는다.
- `props.componentVariants`는 raw variant 목록이 아니라 source에서 명시된 variant visual diff 계약이므로, 해당 필드가 있으면 selected/default/member/guest 등 variant별 시각 차이를 임의 theme 색으로 평균화하지 않는다.

## Root Closure
- 여러 IR이 함께 입력될 수 있으며, codegen은 먼저 이 입력들이 `single-page`, `multi-page`, `multi-state-single-page` 중 어떤 구현 관계인지 판별해야 한다.
- 기본 생성 대상은 `flows.startScreenId` 또는 사용자가 지정한 entry screen 1개다.
- `flows.startScreenId`가 있으면 기본 entry screen으로 본다.
- `components[]`는 현재 entry screen이 직접 참조하는 범위만 closure로 따라 생성한다.
- 같은 IR 안에 다른 screen root가 있더라도, 명시 요청이 없으면 route 연결 정보만 참고하고 자동 생성 범위에 포함하지 않는다.
- 여러 IR이 들어왔을 때도 IR 개수만으로 page 수를 결정하지 않는다.
- title, route, screen id, notes, semantic/state가 거의 동일하고 차이가 선택 상태나 내용 variation 중심이면 같은 page의 상태 후보로 우선 본다.
- 서로 다른 route, 서로 다른 user task, 서로 다른 screen role이면 별도 page 후보로 우선 본다.
- 사용자가 `같은 page의 상태` 또는 `서로 다른 page`라고 명시하면 그 의도를 추론 규칙보다 우선한다.
- 상태 후보 IR들을 같은 page로 합칠 때는 stateful widget, local state, app state 중 기존 프로젝트에 가장 맞는 수단으로 구현한다.
- 현재 생성 범위에 포함된 root는 placeholder나 TODO로 남기지 않는다.

## Navigation
- `interaction.navigation.mode=push|replace|reset`이 있으면 그것을 우선 반영한다.
- 명시 rule이 없으면 일반 `navigate`는 기본적으로 push로 본다.
- `flows[].edges`가 있으면 screen-level route 구조 해석에 우선 사용한다.

### v0.2 Action Types

- `interaction.onTap.type=toggle` -> local bool / selected state 전환
- `interaction.onTap.type=select` -> 선택형 control state 전환 + 선택 결과 반영
- `interaction.onTap.type=submit` -> form submit / primary CTA action
- `interaction.onTap.type=openComponent` -> component root를 modal/overlay/inline expansion 중 IR 맥락에 맞는 방식으로 표시

원칙:

- `toggle`과 `select`는 `navigate`로 치환하지 않는다.
- `openComponent`는 route push보다 component presentation intent를 우선한다.
- `submit`은 단순 button shell이 아니라 완료/확정 action으로 해석한다.

## Prototype
- `interaction.prototype`는 원본 의도 보존용 최우선 reference다.
- `NAVIGATE` -> route 이동
- `OVERLAY` -> modal/overlay
- `SWAP|CHANGE_TO` -> local state/variant 전환
- `SCROLL_TO` -> `ScrollController` 기반 스크롤 이동

## Layout Direction

### layoutMode 우선 읽기
- `node.type`이 `frame`인 노드는 layout intent를 판단하기 전에 `style.layoutMode`를 먼저 확인한다.
- `style.layoutMode = "NONE"` → 자식이 절대 좌표 기반일 가능성이 높다. 다만 먼저 Flutter의 안전한 flow layout으로 재구성 가능한지 검토하고, 겹침이나 고정 좌표 의존이 분명할 때만 `Stack + Positioned`를 사용한다.
- `style.layoutMode = "HORIZONTAL"` → `Row` 또는 가로 `Flex`로 해석한다.
- `style.layoutMode = "VERTICAL"` → `Column` 또는 세로 `Flex`로 해석한다.
- `style.layoutMode`가 없거나 비어 있을 때만 아래 좌표 기반 fallback을 사용한다.
- `node.type`이 `row` / `column` / `stack`으로 명시된 경우에는 `style.layoutMode`보다 `node.type`을 우선한다.

### layoutMode 기반 Flutter 매핑
- `layoutMode = "NONE"` + 자식이 `x/y` 좌표를 가지더라도, 먼저 겹침 여부, z-order 의도, 고정 오프셋 의존성을 보고 `Column` / `Row` / `Padding` / `Align` 같은 flow layout으로 안전하게 풀 수 있는지 검토한다.
- `layoutMode = "NONE"`에서 자식이 1개이거나 좌표 충돌이 없고, 시각 구조를 잃지 않는다면 `Padding` / `SizedBox` / `Align` 기반 해석을 `Positioned`보다 우선한다.
- `layoutMode = "NONE"`에서 서로 겹치는 레이어, 배경 위 오버레이, 자유 배치된 floating action, 절대 좌표 유지가 중요한 장식/배지처럼 flow 재구성 시 의미가 깨지는 경우에만 `Stack` 루트와 `Positioned(left: x, top: y, width: w, height: h)`를 사용한다.
- `layoutMode = "HORIZONTAL"` / `"VERTICAL"`이면 자식 좌표 차이를 간격 추정에 참고하되, `Positioned` 없이 flow layout으로 구성한다.

### 좌표 기반 fallback (layoutMode 없을 때만)
- `node.type = row`면 기본적으로 가로 group으로 해석한다.
- `node.type = column`이면 기본적으로 세로 group으로 해석한다.
- `node.type = listItem`이면 list/card row 성격의 반복 항목으로 우선 해석한다.
- `node.type`이 `frame`이어도 child 좌표 패턴이 강한 row/column signal을 가지면 layout intent를 복원해서 해석할 수 있다.
- row fallback 최소 신호:
  - 같은 parent 아래 sibling 2개 이상
  - sibling의 `style.y` 또는 vertical center가 거의 같음
  - `style.x`가 증가 순서로 배치됨
- column fallback 최소 신호:
  - 같은 parent 아래 sibling 2개 이상
  - sibling의 `style.x` 또는 horizontal center가 거의 같음
  - `style.y`가 증가 순서로 배치됨
- small chip/filter/segmented control group은 row signal이 보이면 `Column`보다 `Row` 또는 `Wrap` 해석을 우선한다.

## Natural Language Memo
- `node.notes.memo`는 구조화 정보가 부족하거나 추가 제약이 있을 때 함께 반영한다.
- 예: loop, swipe, back behavior, implementation hint
- 단, rule string이나 구조화 필드와 충돌하면 구조화 정보가 우선이다.

## Semantic Snapshot Fallback

- `v0.2`에서는 `node.semantic.type`, `node.semantic.label`, `node.semantic.notes`를 직접 읽는다.
- `v0.1`에서는 같은 정보를 `props.semantic`에서 읽을 수 있다.
- 같은 의미가 `node.semantic`과 `props.semantic`에 함께 있으면 `node.semantic` 우선이다.
- `props.designInstance.runtimeHints`는 `node.semantic` 또는 `node.state`를 덮어쓰지 않고, 정식 field가 비어 있을 때만 subtype/state 후보로 참고한다.
- `props.componentVariants`는 `node.semantic` / `node.state`를 덮어쓰지 않지만, variant별 `surface`, `badge`, `text`, `trailingAction` 차이가 있으면 시각 구현 근거로 직접 사용한다.
- `props.designInstance.variantProperties`와 `availableVariants`는 원문 보존 레이어이며, codegen 분기 소스로 직접 사용하지 않는다.
- `node.notes.memo`는 semantic snapshot을 대체하지 않고, 보조 설명이나 미승격 정보 해석에만 쓴다.

예:

- `node.semantic/state`가 current-selection slot 관계를 설명하고, `props.componentVariants.variants["profileKind=member"].surface.strokes`가 있으면
  -> slot 관계는 semantic/state를 따르고, member variant border/fill/trailing action은 componentVariants를 따른다.

예:

- `node.type=radio` 또는 `node.semantic.type=radio` -> radio option control
- `node.type=checkbox` 또는 `node.semantic.type=checkbox` -> checkbox control
- `node.type=datePicker` 또는 `node.semantic.type=datePicker` -> date picker trigger
- `node.type=textField` 또는 `node.semantic.type=textField` -> text input shell

## Selected / Default State
- `v0.2`에 `node.state`가 있으면 그것을 최우선으로 사용한다.
- `node.state.selected`, `node.state.checked`, `node.state.default`, `node.state.active`는 badge 텍스트나 fill/stroke보다 우선이다.
- 세부 시각 토큰 보존과 badge/card 해석 규칙은 [`GUIDE.md`](./GUIDE.md) 를 따른다.

## v0.2 Control Mapping

- `node.type=radio` -> radio option, segmented option, single-choice chip 중 가장 가까운 Flutter 표현
- `node.type=checkbox` -> checkbox row 또는 custom check control
- `node.type=datePicker|timePicker` -> picker trigger field + picker presenter
- `node.type=textField` -> editable input shell 또는 project-standard input widget
- `node.type=tab|segmentedOption` -> local selection control

원칙:

- `v0.2` control type이 있으면 generic `button`이나 `text`로 다시 평탄화하지 않는다.
- 단, 기존 프로젝트에 같은 역할의 공통 widget이 있으면 그 widget으로 번역할 수 있다.

## Detailed Guide
- 상세 생성 규칙, 매핑, 파일 구조, 체크 포인트는 [`GUIDE.md`](./GUIDE.md) 를 따른다.
