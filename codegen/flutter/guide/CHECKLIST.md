# CHECKLIST

## Coverage
- `screens[]`의 모든 항목이 Flutter screen/widget으로 생성되었는가?
- `components[]`의 모든 항목이 Flutter 재사용 위젯으로 생성되었는가?
- 특정 시작 screen만 요청한 경우에도 연결된 `destinationRootId` 대상이 같이 생성되었는가?
- instance `componentRootId`가 가리키는 컴포넌트를 실제로 만들었는가?
- `flows.startScreenId`가 있으면 앱의 시작 화면과 일치하는가?

## Navigation
- `interaction.onTap`이 실제 이벤트 코드로 반영되었는가?
- `interaction.navigation.mode`가 있으면 `push`/`replace`/`reset` semantics가 정확히 반영되었는가?
- `v0.2`의 `toggle` / `select` / `submit` / `openComponent`를 `navigate`나 generic tap으로 뭉개지지 않고 구분해 구현했는가?
- `interaction.prototype.reactions`의 `destinationRootId` 대상이 누락 없이 구현되었는가?
- `flows[].edges`가 있으면 screen-level 이동 구조와 실제 route 구현이 일치하는가?
- route 이름과 destination root 연결이 일치하는가?
- `NAVIGATE`, `OVERLAY`, `SWAP`, `CHANGE_TO`, `SCROLL_TO`를 무시하지 않았는가?
- `node.notes.memo`의 자연어 요구사항을 빠뜨리지 않았는가?

## UX Fidelity
- overlay 연결이 modal/dialog/bottom sheet 등으로 반영되었는가?
- prototype transition 정보가 완전히 버려지지 않았는가?
- component variant/state 전환이 constructor/state 모델로 풀렸는가?
- `v0.2`의 `node.state.selected|checked|default|active`가 있으면 badge/style heuristic보다 우선 적용했는가?
- `v0.2`의 `node.semantic`이 있으면 같은 의미의 `props.semantic`보다 우선 해석했는가?
- `props.componentVariants`가 있으면 variant별 stroke/fill/effect/badge/trailing action 차이를 실제 구현에 반영했는가?
- `props.componentVariants`를 `props.designInstance.availableVariants` 같은 raw trace 메타와 혼동하지 않았는가?
- `props.componentVariants`가 current-selection slot card에 있으면 member/guest 등 variant별 shell 차이를 generic 카드 스타일로 평균화하지 않았는가?
- `props.designInstance.runtimeHints`를 참고하더라도 `node.semantic` / `node.state` / interaction을 덮어쓰지 않았는가?
- `props.designInstance.variantProperties` 또는 `availableVariants` 전체를 codegen 분기 소스로 과해석하지 않았는가?
- `props.designInstance`의 description/component-set description 같은 trace 텍스트만으로 새 상태 머신이나 enum API를 만들어내지 않았는가?
- 같은 의미가 정식 field와 `designInstance.runtimeHints`에 중복될 때 정식 field 하나만 source-of-truth로 사용했는가?
- `radio`, `checkbox`, `datePicker`, `textField`, `tab`, `segmentedOption` 같은 `v0.2` control type을 generic `button` 또는 `text`로 평탄화하지 않았는가?
- 오토레이아웃 구조가 Flutter 레이아웃으로 자연스럽게 보존되었는가?
- `node.type = row|column` 또는 강한 좌표 패턴이 있는 group에서 방향 해석이 뒤집히지 않았는가?
- chip/filter/segmented control 같은 small horizontal group이 세로 `Column`으로 무너지지 않았는가?
- fixed height를 과도하게 박지 않고, locale/폰트/런타임 콘텐츠 증가에도 overflow 없이 세로 확장 가능하게 해석했는가?
- stretch context 안의 고정 크기 interactive 위젯이 부모 폭 전체 탭 영역으로 팽창하지 않았는가?
- header cluster를 body section으로 잘못 분해하지 않고, 필요하면 `AppBar`/custom header 중 더 자연스러운 방식으로 유지했는가?
- 기존 파일 수정 시 구조는 프로젝트 흐름에 맞추되, selected/default 상태, badge 의미, CTA prominence 같은 IR 핵심 시각 신호를 잃지 않았는가?
- selected/default badge, accent token, summary card 폭 체계가 일반 카드나 theme 색으로 잘못 평탄화되지 않았는가?
- variant별 trailing clear/close action이 IR에 있으면 실제로 보이고, 없는 variant에는 나타나지 않는가?
- 선택형 control의 상태 affordance가 보이고, picker trigger를 plain text field로 오해하지 않았는가?
- background effect를 구조보다 우선하지 않되, 화면 분위기에 중요한 후면 색면/gradient/glow를 과도하게 삭제하지 않았는가?
- shadow/glow/outline이 중요한 surface가 visual bleed margin 없이 스크롤/뷰포트 가장자리에서 잘리지 않는가?
- 같은 CTA row 안의 버튼들을 공용 primary/secondary 패턴으로 평탄화하면서 버튼별 width/fill/stroke/effect/radius 차이를 잃지 않았는가?
- dual-CTA row에서 비대칭 폭, neutral/primary 대비, disabled 시각 상태를 앱 공통 패턴으로 평균화하지 않았는가?
- fixed CTA/footer를 썼다면 IR 근거 또는 강한 기존 패턴이 있고, 없다면 body의 단일 scroll content 포함을 유지했는가?
- 주요 action/button row가 누락되지 않고 항상 보이거나 명확히 도달 가능한가?
- 기존 프로젝트에 동일 구조가 없다면 새 사용자 노출 텍스트가 l10n으로 분리되었는가?
- 텍스트 매핑 계획을 세웠고, 화면 인상 텍스트가 의미만 비슷한 기존 l10n key로 과도하게 흡수되지 않았는가?
- 기존 프로젝트에 동일 구조가 없다면 공통 alert/dialog util이 도입되었는가?
- 기존 프로젝트에 동일 구조가 없다면 screen shell이 `Scaffold`의 `appBar`와 `endDrawer`를 우선 사용했는가?
- 기존 종료 정책이 없다면 마지막 back history에서 종료 확인 alert가 공통 계층에서 처리되는가?

## Code Quality
- placeholder/stub/TODO 위젯이 남아 있지 않은가?
- screen과 component 파일이 분리되었는가?
- 중복 component 구현이 없는가?
- import, route table, shared helper가 빌드 가능한 구조로 정리되었는가?
