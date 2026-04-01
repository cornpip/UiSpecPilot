# GUIDE

`flutter_ir.json`에서 Flutter 코드를 생성할 때는 입력 IR들의 관계를 먼저 판별한 뒤, 이번 요청의 구현 단위를 screen/page/state 기준으로 결정한다.

앱 구조 공통 기본값은 [`FLUTTER_APP_BASELINE.md`](./FLUTTER_APP_BASELINE.md) 를 따르고,
IR 해석 우선순위는 [`IR_CODEGEN_BASELINE.md`](./IR_CODEGEN_BASELINE.md) 를 따른다.

## Goal
- `screens[]`를 Flutter screen/page로 변환한다.
- `components[]`를 재사용 가능한 Flutter widget으로 변환한다.
- prototype 연결과 component reference를 따라 필요한 대상 root를 누락 없이 구현한다.
- `interaction.prototype`에 담긴 원본 의도를 잃지 않으면서 Flutter에서 실행 가능한 navigation/modal/state 전환 코드로 내린다.
- `flows[]`가 있으면 시작 화면과 screen-level 이동 그래프를 우선 참고한다.
- 기존 프로젝트에 이미 있는 shell, l10n, alert util, back handling, drawer 패턴을 우선 재사용한다.

## Generation Modes

- `single-page mode`: 하나의 IR 또는 하나의 entry screen을 참고해 단일 page를 구현한다. 기본값은 이 모드다.
- `multi-page mode`: 여러 IR 또는 여러 screen을 각각 별도 route/page로 구현한다.
- `multi-state-single-page mode`: 여러 IR을 별도 route로 나누지 않고, 같은 page의 상태 변화로 합쳐 구현한다.

## Mode Selection Rules

- 사용자가 page/state 관계를 명시하면 그 지시를 최우선으로 따른다.
- 명시가 없으면 먼저 `single-page mode`를 기본값으로 둔다.
- 입력 IR이 여러 개일 때는 각 IR의 `route`, `screen.id`, 제목, notes, state semantic을 비교해 `multi-page mode`와 `multi-state-single-page mode` 중 무엇이 맞는지 먼저 판별한다.
- 서로 다른 사용자 흐름 단계, 서로 다른 route, 서로 다른 screen 역할이면 `multi-page mode`를 우선한다.
- `default`, `selected`, `empty`, `filled`, `loading`, `error`, `expanded`처럼 같은 화면의 상태 변형으로 읽히고, title/structure가 거의 같으며 차이가 state/selection/content variation 중심이면 `multi-state-single-page mode`를 우선한다.
- 같은 page의 상태로 해석할 수 있는 입력을 별도 route/page로 쪼개는 것보다, stateful widget이나 local/app state로 합치는 해석을 우선한다.
- 반대로 서로 다른 task를 수행하는 화면인데도 단일 page 상태로 억지로 합치지 않는다.
- mode 판단이 애매하면 가정을 명시하고, 가장 보수적인 기본값은 `multi-page mode`가 아니라 `single-page mode` 또는 사용자가 직접 지정한 entry 범위다.

## Generation Algorithm
1. 입력 IR 목록과 각 IR의 `screens[]`, `components[]`, `interactions[]`, `flows[]`를 인덱싱한다.
2. 기존 프로젝트에 이미 존재하는 라우터, l10n, 공통 alert util, scaffold shell, back handling 패턴을 먼저 탐색한다.
3. 이번 요청이 `single-page mode`, `multi-page mode`, `multi-state-single-page mode` 중 무엇인지 먼저 결정한다.
4. `flows[]`가 있으면 `startScreenId`와 `edges`를 읽어 screen-level navigation graph를 먼저 만든다.
5. `screen.id`, `component.id`, `interaction.targetNodeId`, `props.componentRootId`, `interaction.prototype.reactions[].actions[].destinationRootId` 기준으로 lookup map을 만든다.
6. `single-page mode`에서는 `startScreenId` 또는 사용자가 명시한 entry screen 1개를 기본 구현 대상으로 잡는다.
7. `multi-page mode`에서는 사용자가 지정했거나 입력 관계가 분명한 page 집합만 구현 대상으로 잡는다.
8. `multi-state-single-page mode`에서는 상태 전/후 IR들을 같은 page의 상태 모델로 정규화하고, page route는 하나만 유지한다.
9. `components[]`는 현재 구현 범위가 직접 참조하는 범위만 closure로 계산해 함께 생성한다.
10. IR의 사용자 노출 텍스트를 수집하고 기존 l10n key 중 exact 또는 near-exact match만 재사용 후보로 본다.
11. 재사용 기준을 만족하지 않는 텍스트는 새 l10n key로 분리하고, route table, modal presenter, shared component import를 함께 생성해 빌드 가능한 상태로 마무리한다.

## Root Closure Rules
- `single-page mode`의 기본 구현 대상은 `startScreenId` 또는 사용자가 지정한 entry screen 1개다.
- `multi-page mode`의 기본 구현 대상은 사용자가 명시한 page 집합 또는 입력 관계상 별도 page로 판별된 screen 집합이다.
- `multi-state-single-page mode`에서는 상태 후보 screen/IR들을 그대로 page 수만큼 만들지 말고, 먼저 하나의 page state model로 합칠 수 있는지 검토한다.
- `flows.startScreenId`가 있으면 그 화면을 기본 entry screen으로 본다.
- 다른 screen이 `flows[]`에 보이더라도, 그 screen root가 같은 IR 안에 있다는 이유만으로 기본 생성 대상에 자동 포함하지 않는다.
- 다른 IR이 함께 주어졌더라도, 그 IR이 같은 page의 상태 참조물인지 별도 page인지 판별 없이 곧바로 구현 단위로 승격하지 않는다.
- 특정 화면을 생성할 때 아래 항목은 반드시 같이 포함한다.
- 현재 root 내부 instance의 `props.componentRootId`
- 현재 root 내부 interaction의 `payload.prototype.reactions[].actions[].destinationRootId`
- 위 대상 root가 다시 참조하는 또 다른 `componentRootId`와 `destinationRootId`
- `interaction.onTap.to`만 있고 `destinationRootId`가 없을 경우 route 문자열 기준으로 대응 screen을 찾는다.
- route 대응 screen을 찾더라도, 그 screen root가 현재 구현 범위 밖이면 route 연결만 남기고 화면 구현 자체는 자동 확장하지 않는다.
- 현재 구현 범위에 포함된 root는 stub나 TODO 위젯으로 남기지 않는다.
- `node.notes.memo`가 있으면 구조화 필드와 함께 반드시 참고한다.

## File Layout Recommendation
- 기존 프로젝트의 파일 배치가 있으면 그것을 우선 사용한다.
- `lib/app.dart`: `MaterialApp` 또는 `GoRouter` 설정
- `lib/routes/app_router.dart`: route table과 screen registry
- `lib/screens/<screen_name>_screen.dart`: screen root 구현
- `lib/widgets/<component_name>.dart`: 재사용 컴포넌트 구현
- `lib/widgets/prototype/`: overlay presenter, transition helper 같은 공통 보조 코드

## Dependency Rule
- 새 패키지 의존성을 추가해야 하면 가능하면 최신 안정 버전을 우선 사용한다.
- 단, 기존 프로젝트의 SDK 제약, 이미 고정된 패키지 생태계, 다른 의존성과의 호환성 문제가 있으면 그 범위 안에서 가장 최신의 호환 버전을 사용한다.
- 이미 프로젝트에 같은 패키지가 있으면 중복 추가하지 말고 기존 버전/사용 패턴을 따른다.
- 의존성 추가는 최소화하고, Flutter SDK 기본 기능으로 해결 가능한 경우 새 패키지를 늘리지 않는다.

## Node Mapping
- `column` -> `Column` 또는 세로 `Flex`
- `row` -> `Row` 또는 가로 `Flex`
- `stack` / 겹침 구조 -> `Stack`
- `frame` / `container` -> `Container`, `SizedBox`, `DecoratedBox`, `Padding` 조합
- `text` -> `Text`
- `image` -> `Image`, `Image.asset`, `Image.network`, placeholder wrapper
- `icon` -> `Icon`, `CustomPaint`, `SvgPicture`
- `button` -> `GestureDetector`, `InkWell`, `TextButton`, `ElevatedButton` 중 스타일 보존이 쉬운 쪽
- `list` -> `ListView`, `SingleChildScrollView`, `CustomScrollView`
- `pageView` -> `PageView`
- `listItem` -> 반복 카드/row item widget
- `textField` -> `TextField`, `TextFormField`, project-standard input widget
- `datePicker` / `timePicker` -> picker trigger widget + picker presenter
- `checkbox` -> `CheckboxListTile`, custom checkbox row, project-standard agreement control
- `radio` -> radio option, segmented option, selectable chip
- `tab` / `segmentedOption` -> local selection tab/segmented control
- `appBar` -> `Scaffold.appBar` 또는 header widget

## Style Mapping
- `style.width`, `style.height`는 고정값이 필요할 때만 직접 사용한다.
- 오토레이아웃 구조가 있으면 `Expanded`, `Flexible`, `MainAxisAlignment`, `CrossAxisAlignment`를 우선 사용한다.
- `style.fill`은 배경색 또는 텍스트/아이콘 색으로 매핑한다.
- `style.cornerRadius`는 `BorderRadius`로 매핑한다.
- `style.layoutMode = "NONE"`은 절대 배치 가능성이 높은 신호로 간주하되, 먼저 Flutter의 안전한 flow layout으로 재구성 가능한지 검토한다. 겹침, 레이어 분리, 고정 좌표 의존이 명확할 때만 `Stack + Positioned`를 사용한다.
- `style.layoutMode`가 없을 때만 좌표 패턴으로 배치 방식을 추론한다.
- Figma 값을 그대로 옮기되, Flutter 레이아웃이 깨지면 구조적 의미를 우선한다.
- `props.componentVariants`가 있으면 variant별 `surface` / `badge` / `text` / `trailingAction` diff를 실제 style mapping 입력으로 사용한다.

### Component Variant Diff Mapping

- `props.componentVariants`는 `props.designInstance.availableVariants`와 달리 source-of-truth visual diff다.
- `node.semantic` / `node.state`는 어떤 variant가 현재 의미상 활성인지 결정하는 기준이고, `props.componentVariants.currentVariant`와 `variants[*]`는 그 variant의 실제 시각 차이를 구현하는 기준이다.
- selected/default/member/guest 같은 관계를 `props.componentVariants`만 보고 새로 발명하지 않는다. 그 관계는 먼저 `node.semantic` / `node.state` / interaction에서 읽는다.
- 반대로 variant별 stroke/fill/effect/badge/trailing action 차이가 `props.componentVariants`에 있으면, 이를 generic project theme나 임의 accent color로 평탄화하지 않는다.
- `variants[*].surface.strokes`가 있으면 card/container border 해석의 최우선 근거로 쓴다.
- `variants[*].surface.fills` / `effects`가 있으면 selected/default card shell의 후면 톤과 depth cue를 복원하는 근거로 쓴다.
- `variants[*].badge`가 있으면 badge text/color를 visible text heuristic보다 우선한다.
- `variants[*].text`가 있으면 title/meta 등 slot text의 variant별 차이를 반영한다.
- `variants[*].trailingAction`이 있으면 선택 해제, 닫기, clear selection 같은 보조 affordance를 별도 action node로 구현한다.
- `trailingAction`이 있는 variant와 없는 variant를 같은 widget shell로 합칠 때는 nullable trailing slot이나 stateful branch를 사용해, 존재 차이를 명시적으로 보존한다.

### Existing-file Style Harmonization

- 기존 화면/파일을 수정할 때는 typography scale, spacing rhythm, shell 구조 같은 큰 흐름만 기존 프로젝트에 맞춘다.
- gradient, stroke, shadow, radius, surface depth, button shell처럼 화면 인상을 좌우하는 개별 토큰은 IR 근거가 있으면 유지하는 쪽을 우선한다.
- 즉, 기존 파일 수정의 기본값은 `구조는 프로젝트에 맞추고, 핵심 시각 토큰은 IR을 우선 보존`이다.

### Layout Overflow Prevention

- IR의 `style.height`는 기본적으로 Flutter의 고정 제약이 아니라 디자인 기준의 시각 높이로 해석한다.
- `Text`, `Column`, form field, helper text, checkbox row, button row처럼 내부 콘텐츠 높이가 런타임에 달라질 수 있는 구조에는 `height`를 직접 박지 않는 것을 기본으로 한다.
- section/card root가 `stack`, `frame`, `container`여도 내부가 사실상 세로 폼 구조이면 `Container(height: ...)`보다 `Column + padding + spacing`으로 재구성하고, 필요하면 `BoxConstraints(minHeight: ...)`만 사용한다.
- IR 높이를 유지하고 싶더라도 우선순위는 `padding -> spacing -> minHeight -> fixed height` 순서로 적용한다.
- localized text, `ScreenUtil`, 폰트 메트릭, 줄바꿈 가능성 때문에 디자인상 딱 맞아 보이는 고정 높이도 Flutter 런타임에서는 `RenderFlex overflow`를 일으킬 수 있다고 전제한다.
- subtitle, placeholder, agreement text, CTA label처럼 locale 길이 차이에 민감한 텍스트는 고정 높이 박스 안에 강제로 맞추지 않는다.
- `Container(height: X)` 또는 `SizedBox(height: X)` 안에 `Column`을 둘 때, 자식 높이 합이 X에 매우 근접하면 overflow 위험 구조로 간주하고 다른 해석을 우선한다.
- card/section의 목표 높이가 필요하면 `constraints: BoxConstraints(minHeight: ...)`를 우선 사용하고, 콘텐츠가 더 커질 경우 자연스럽게 늘어나게 둔다.
- 버튼 row는 버튼 자신의 높이만 고정하고, 그 버튼 row를 감싸는 상위 card/footer/content band의 높이는 가능하면 콘텐츠 기반으로 둔다.
- 절대 좌표 기반 IR를 Flutter의 flow layout으로 재구성할 때는 디자인 수치 일치보다 런타임 제약 안전성을 우선한다.

### Fixed-size Interactive Widget in Stretch Context

- `GestureDetector` / `InkWell`은 부모 제약을 상속하므로, stretch context 안의 고정 크기 interactive 위젯은 필요하면 `Align`이나 명시적 정렬로 탭 영역 팽창을 막는다.
- 특히 `layoutMode: "NONE"` 절대 좌표 interactive 노드를 Column 흐름으로 재구성할 때, `width + height`가 모두 명시된 경우는 이 문제를 먼저 점검한다.

### Header Mapping

- 최상단에 back/menu affordance와 title/subtitle, 우측 action이 같은 band에 있으면 먼저 하나의 header cluster로 해석한다.
- 기존 프로젝트가 `Scaffold + AppBar` 패턴을 쓰고, 상단 band가 hero/card 일부가 아니라 일반 navigation 영역에 가깝다면 `AppBar`/`leading`/`actions` 승격을 우선 검토한다.
- 반대로 상단 요소가 body section, hero, decorative band 일부라는 근거가 더 강하면 custom header로 유지한다.
- header를 승격하더라도 padding, 크기, 원형 버튼 shell, shadow, fill/stroke 같은 핵심 토큰은 최대한 유지한다.

### Selected / Badge Visual Mapping

- card/container에 selected/default state를 나타내는 대표 stroke, fill, accent color가 있으면 이를 앱 공통 gradient나 임의 highlight color로 재해석하지 않는다.
- 짧은 badge text가 `기본 선택`, `선택됨`, `active`, `selected` 계열이면 mode/category badge보다 state badge로 우선 구현한다.
- state badge text는 의미가 비슷한 다른 도메인 라벨로 치환하지 않는다.
- check badge + accent stroke + highlighted fill 조합이 있으면 selected variant를 명시적으로 만든다.
- selected/default 상태의 시각 토큰은 카드 shell의 일부로 간주하며, 일반 decoration 단순화 과정에서 버리지 않는다.

### List Item Width Preservation

- `node.type = listItem`은 기본적으로 content-fit box가 아니라 list row 또는 full-width card 후보로 먼저 해석한다.
- screen-level list 안의 `listItem`은 특별한 근거가 없으면 부모 content width를 채우는 폭 규칙을 기본값으로 사용한다.
- selected/default summary card가 `listItem` 또는 그와 동급의 card shell로 표현되어 있으면, 상태 차이 때문에 intrinsic width 기반의 더 좁은 박스로 축소하지 않는다.
- `Column` 안에 카드형 `listItem`을 배치할 때는 필요하면 `crossAxisAlignment: CrossAxisAlignment.stretch`, `SizedBox(width: double.infinity)`, 폭을 채우는 부모 제약 중 하나를 사용해 full-width intent를 보존한다.
- card 내부 자식이 `Column` 하나뿐이라는 이유로 카드 root 자체를 content width에 맞춰 줄이지 않는다.
- 같은 card family로 읽히는 selected card, default card, 일반 list item은 특별한 IR 근거가 없으면 동일한 가로 content width 체계를 유지한다.

### Background Effect Mapping

- background effect는 구조/인터랙션보다 우선하지 않는다.
- 다만 화면 분위기에 실질적으로 기여하는 gradient, glow, depth cue는 가능한 범위에서 후면 레이어로 최소 복원한다.
- 복잡한 blur/mask/compositing은 단순화할 수 있지만, 큰 색면과 위치 관계는 쉽게 버리지 않는다.

### Scroll Region Mapping

- screen/page body에서 특정 부분만 scrollable 이라는 구조화 신호가 없으면, body의 주요 콘텐츠 전체를 하나의 세로 scroll 흐름으로 먼저 검토한다.
- 절대 좌표상 하단에 배치된 CTA, footer, button row는 기본값으로 body의 단일 vertical scroll content에 포함한다.
- required notice, section card, privacy/agreement row, CTA/button row처럼 하나의 세로 폼 흐름을 이루는 요소들은 일부만 scroll 밖으로 분리하지 않는 것을 기본 규칙으로 한다.
- fixed CTA/footer는 별도 scroll container, 명시된 고정 action 의도, 강한 기존 프로젝트 패턴, 명확한 상하단 band 분리 중 하나가 있을 때만 검토한다.
- 위 근거가 약하면 `bottomNavigationBar`나 body 밖 고정 CTA보다 body의 단일 scroll content 포함을 기본값으로 유지한다.
- fixed CTA/footer를 택한 경우에도 주요 action/button row는 누락 없이 항상 보이거나 명확히 도달 가능해야 한다.

### Shadow Bleed And Visual Bounds

- IR의 `width`/`height`는 기본적으로 본체 bounds로 읽고, shadow/glow/outline의 visual bleed는 별도로 확보한다고 본다.
- `BoxShadow`나 외곽 glow가 있는 surface는 본체 크기만 맞추지 말고 margin/padding/scroll content padding까지 포함해 clipping 위험을 점검한다.
- shadow prominence가 중요한 카드, 상단 요약 카드, 하단 CTA는 잘림 없이 온전하게 보이는 것을 기본 품질 조건으로 본다.

### Page CTA And Selected Card Separation

- screen 하단 근처의 넓은 primary button이 현재 선택/입력 결과를 확정하거나 다음 단계로 진행하는 action이라면 page-level CTA로 우선 해석한다.
- selected/default card 내부의 상태 설명, badge, 보조 문구는 page-level CTA와 다른 역할로 취급하고 자동 병합하지 않는다.
- 선택 카드가 상단 요약 카드 역할을 하고 별도 하단 CTA가 있으면, 선택 카드를 일반 list item이나 CTA 자체로 평탄화하지 않는다.
- button이 명확히 card 내부 action이거나 section submit row에 속하면 page-level CTA 규칙을 적용하지 않는다.

### CTA Pair Token Preservation

- 인접한 CTA 버튼은 semantic role이 비슷해도 공용 `primary/secondary` 셸로 쉽게 평탄화하지 않는다.
- 버튼별 `width`, `cornerRadius`, `fills`, `strokes`, `effects`, 텍스트 색 차이는 위계 신호로 보고 우선 보존한다.
- dual-CTA row의 폭이 비대칭이면 `Expanded + Expanded` 균등 분할보다 IR의 비율 신호 보존을 우선한다.

### Disabled Visual State Interpretation

- 앱 로직상 아직 제출할 수 없어도, CTA의 시각 상태는 먼저 IR 기준으로 본다.
- `node.state.disabled`, 비활성 alpha, muted fill, disabled label color 같은 신호가 없으면 자동 disabled palette 적용을 기본값으로 삼지 않는다.
- 실제 disabled 동작이 필요하면 interaction 차단과 시각 상태 변경을 분리해 검토한다.

## Localization Mapping
- IR에 명시된 사용자 노출 텍스트는 기본적으로 원문 보존 대상이다.
- 기존 프로젝트의 l10n key는 탐색하되, 실제 사용자 노출 문구가 동일하거나 조사/공백/대소문자 차이 수준일 때만 재사용한다.
- 의미가 비슷하다는 이유만으로 다른 문구의 기존 key로 치환하지 않는다.
- 헤더, CTA, placeholder, chip label, empty state처럼 화면 인상에 직접 영향을 주는 텍스트는 near-match 재사용보다 새 key를 우선한다.
- 화면 맥락 의존 문구는 가능하면 screen-scoped key를 사용하고, 생성 제약으로 임시 fallback을 썼다면 응답에서 명시한다.

## Interaction Mapping
- `interaction.onTap.type=navigate` -> route 이동
- `interaction.navigation.mode=push` -> push 계열 이동으로 구현
- `interaction.navigation.mode=replace` -> replace 계열 이동으로 구현
- `interaction.navigation.mode=reset` -> stack reset 성격 이동으로 구현
- `interaction.onTap.type=openModal` -> `showDialog`, `showModalBottomSheet`, custom overlay
- `interaction.onTap.type=openComponent` -> component root를 modal/overlay/inline expansion 중 가장 가까운 presentation으로 구현
- `interaction.onTap.type=toggle` -> local selected/checked/bool state 전환
- `interaction.onTap.type=select` -> single-choice 또는 segmented selection 전환
- `interaction.onTap.type=submit` -> form submit / confirm / primary completion action
- `interaction.scroll.axis=vertical` -> 세로 스크롤
- `interaction.scroll.axis=horizontal` -> 가로 스크롤
- `interaction.gesture.type=swipe` + `horizontal` -> `PageView`
- `interaction.gesture.type=swipe` + `vertical` -> 세로 pager 또는 dismiss gesture

## v0.2 Semantic Rules

- `node.semantic`이 있으면 같은 의미의 `props.semantic`보다 우선한다.
- `node.state`가 있으면 badge text나 style heuristic보다 우선한다.
- `props.designInstance.runtimeHints`가 있어도 `node.semantic` / `node.state` / 구조화 interaction을 덮어쓰지 않는다.
- `props.componentVariants`가 있으면 raw design trace보다 우선하는 visual diff 계약으로 사용한다.
- `props.designInstance.runtimeHints.state|kind`는 정식 field가 비어 있을 때만 subtype 또는 styling hint 후보로 참고한다.
- `props.designInstance.variantProperties`와 `availableVariants`는 원문 보존 메타로 간주하고, codegen 분기 입력으로 직접 사용하지 않는다.
- `props.designInstance`의 description/component-set description은 trace 설명으로만 참고하고, 설명 문구만으로 enum/state/route/component API를 새로 만들지 않는다.
- `v0.2`의 `radio`, `checkbox`, `datePicker`, `textField`, `tab`, `segmentedOption`은 generic `button`/`text` fallback으로 되돌리지 않는다.
- `v0.2`에서도 `props.semantic`과 `notes.memo`는 참고하지만, 정식 field를 덮어쓰지 않는다.

예:

- `node.type=radio` + `interaction.onTap.type=toggle` + `state.selected=true`
  -> 선택형 radio option으로 구현
- `node.type=checkbox` + `state.checked=true`
  -> checked 상태가 보이는 agreement row로 구현
- `node.type=datePicker` + `interaction.onTap.type=openModal`
  -> 읽기 전용 input shell + date picker presenter

## Prototype Mapping
- prototype의 원본 정보는 `interaction.prototype`에 있고, 이것이 최우선 원본이다.
- `trigger.type=ON_CLICK|ON_PRESS|MOUSE_UP` + `action.type=NODE`는 탭 계열 interaction으로 본다.
- `navigation=NAVIGATE`는 다른 screen route 이동으로 구현한다.
- `navigation=SWAP` 또는 `CHANGE_TO`는 탭/세그먼트/variant 상태 전환으로 구현한다.
- `navigation=OVERLAY`는 overlay/modal presenter로 구현한다.
- `navigation=SCROLL_TO`는 `ScrollController`를 사용한 위치 이동으로 구현한다.
- `transition.type`이 있으면 대응 가능한 Flutter 애니메이션을 고른다.
- `SMART_ANIMATE`는 `AnimatedSwitcher`, `AnimatedContainer`, `Hero`, implicit animation 우선
- `DISSOLVE`는 `FadeTransition` 또는 `AnimatedOpacity`
- `MOVE_IN`, `MOVE_OUT`, `PUSH`, `SLIDE_IN`, `SLIDE_OUT`는 `SlideTransition` 또는 page transition builder
- 완전한 1:1 구현이 어려운 transition이어도 type/direction/duration/easing 의도는 주석이나 helper 이름에 남긴다.

## Natural Language Memo Rules
- `node.notes.memo`는 디자이너가 남긴 자연어 의도다.
- 메모는 Figma에서 `__spec_meta__#<nodeId>` 텍스트 레이어로 수집된 값일 수 있다.
- `interaction`에 구조화 정보가 있더라도 `notes.memo`가 추가 제약을 주면 함께 반영한다.
- 예: `마지막 컨텐츠면 다시 첫 번째 컨텐츠로 순환` -> `PageView` 또는 carousel 구현에서 loop 동작 추가
- 예: `왼쪽/오른쪽으로 넘기면` -> swipe/pager 의도로 해석
- memo는 버리지 말고, 코드 주석 또는 helper naming에 의도를 남긴다.
- state badge 또는 selected/default 설명이 memo에 남아 있으면 styling fallback보다 상태 의미 보존을 우선한다.

## Rule String Priority
- `flow:*:start`, `nav:push`, `nav:replace`, `nav:reset` 같은 rule string은 자연어 메모보다 우선한다.
- `nav:*` rule은 destination screen이 아니라 출발 trigger node의 이동 semantics로 해석한다.
- `interaction.navigation.mode`가 없으면 일반 `navigate`는 기본적으로 push로 본다.

## Destination Resolution
- `flows[].edges`가 있으면 screen-level 이동 해석에 우선 사용한다.
- `destinationRootId`가 `screens[]`에 있으면 route 목적지다.
- `destinationRootId`가 `components[]`에만 있으면 현재 screen 내부에서 띄우는 컴포넌트다.
- `destinationRootNodeId`와 `destinationRootName`은 파일명/클래스명 생성에 활용한다.
- `destinationId`만 있고 root id가 비어 있으면 node를 직접 구현 대상으로 삼지 말고 root를 역추적한 결과가 있는지 먼저 확인한다.

## Component Rules
- `props.componentId`, `props.componentName`, `props.componentRootId`, `props.componentRootName`는 component 연결의 기준이다.
- 동일 component root를 여러 instance가 참조하면 단일 widget 클래스로 통합한다.
- instance별 차이는 visual/semantic 차이가 실제 구현 차이로 이어질 때만 constructor parameter나 explicit state parameter로 노출한다.
- `props.componentVariants`가 있으면 instance별 variant visual 차이는 constructor/state로 노출할 수 있다. 단, 그때도 variant 의미의 source-of-truth는 `node.semantic` / `node.state`다.
- `props.designInstance.variantProperties`가 있다고 해서 자동으로 enum/bool/sealed configuration으로 승격하지 않는다.
- `props.designInstance`의 variant description이나 component description이 있어도 그것만으로 런타임 source-of-truth를 만들지 않는다.
- selected/default/active 차이는 먼저 `node.state`와 `node.semantic`으로 판별하고, 비어 있을 때만 `runtimeHints`를 보조 신호로 사용한다.
- 핵심 UX 관계가 이미 현재 IR의 `node.semantic` / `node.state` / structured interaction으로 표현되어 있으면, 새 variant 전용 런타임 모델을 추가로 상상하지 말고 그 최소 계약을 그대로 사용한다.
- `props.designInstance`가 있으면 Figma component/variant 원문 참조로 보존하되, Flutter API surface는 `runtimeHints` allowlist와 실제 visual/semantic 차이만 기준으로 결정한다.
- 같은 의미가 `node.state.selected=true`와 `props.designInstance.runtimeHints.state="selected"`처럼 중복되면 정식 field를 source-of-truth로 사용하고, designInstance 쪽은 설명/trace 용도로만 남긴다.
- `props.componentVariants`와 현재 화면 state가 함께 있으면, 공용 widget API를 무리하게 enum으로 일반화하기보다 현재 요청 범위에 필요한 variant branch만 명시적으로 구현하는 쪽을 우선한다.

## Screen Rules
- 각 screen은 독립적으로 렌더 가능해야 한다.
- screen 간 이동은 하드코딩된 문자열이 아니라 route registry를 통과시킨다.
- 시작 화면이 명확하면 `/` 또는 첫 screen을 `initialRoute`로 둔다.
- 기본 생성에서는 entry screen을 우선 완성하고, 연결 화면은 명시 요청이나 별도 IR 입력이 있을 때 확장한다.
- 여러 IR이 같은 page의 상태 변형을 나타내면, 별도 screen class를 복제하기보다 동일 page 내부 state 전환으로 구현하는 것을 우선한다.
- 같은 page의 상태 변형을 구현할 때는 상태 간 시각 차이를 generic 공통 화면으로 평탄화하지 않는다.
- 기존 프로젝트에 `Scaffold` 기반 AppBar/endDrawer 패턴이 없으면 기본 screen shell은 그 구조를 우선 적용한다.
- 기존 프로젝트에 l10n이 없으면 새 사용자 노출 텍스트는 l10n으로 분리한다.
- 기존 프로젝트에 l10n이 있더라도 IR 원문과 다른 기존 key로 치환하지 말고, 동일 문구가 없으면 새 key를 추가하는 것을 우선한다.
- selected/default 상태 라벨은 mode/category 설명 텍스트보다 우선 보존한다.
- 기존 프로젝트에 공통 alert 유틸이 없으면 dialog/confirm 계열은 공통 util을 먼저 만든 뒤 사용한다.
- 마지막 route history에서 back을 처리해야 하면 기존 정책이 없을 때 종료 확인 alert를 공통 계층에서 처리한다.

## Recommended Output Shape
- `AppRouter` 또는 `GoRouter` 설정
- screen 위젯 파일들
- component 위젯 파일들
- prototype overlay/helper 파일
- 필요 시 `PrototypeNavigator` 같은 얇은 보조 계층

## Non-Negotiable Constraints
- 생성 대상 root 누락 금지
- placeholder widget 금지
- interaction 무시 금지
- prototype 목적지 누락 금지
- component reference 누락 금지
- route와 destination 연결 불일치 금지
