# ui_spec.semantic -> flutter_ir Mapping Rules

이 문서는 현재 `ui_spec` source semantic을 `flutter_ir v0.1` 구조로 내리는 초안 매핑 표다.
공통 compiler 규칙은 [`../../UI_SPEC_TO_IR_BASELINE.md`](../../UI_SPEC_TO_IR_BASELINE.md) 를 전제로 한다.

## Goal

- 공통 baseline 위에서 Flutter target에 필요한 field mapping을 고정한다.
- 현재 `flutter_ir v0.1` schema 안에서 바로 수용 가능한 항목과 schema 확장이 필요한 항목을 구분한다.
- legacy exporter parity 비교 기준을 만든다.

## Inputs And Constraints

입력 기준:

- `ui_spec/guides/01-schema-rules.md`
- `ui_spec/guides/04-semantic-quality-gate.md`
- `ui_spec/guides/05-semantic-to-ir-check.md`
- `compilers/flutter_ir/schema/flutter_ir_v0_1.schema.json`
- `compilers/flutter_ir/examples/sample_flutter_ir.json`

제약:

- 가능하면 `flutter_ir v0.1` schema를 유지한다.
- codegen 가이드가 이미 기대하는 lookup key (`screen.id`, `component.id`, `componentRootId`, `flows[]`, `interactions[]`)는 깨지지 않게 유지한다.

## Flutter-specific Mapping Policy

- `ui_spec`의 visual field는 `flutter_ir`의 `root.props` / `root.style` / `children`로 분리해서 내린다.
- `ui_spec.semantic`은 `flutter_ir`의 root metadata, node `interaction`, `notes`, top-level `interactions[]`, `flows[]`로 분산된다.
- `ui_spec.componentVariants`는 raw trace 메타가 아니라 source-of-truth variant diff이므로 손실 없이 보존한다.
- `flutter_ir v0.1`에 없는 semantic detail은 direct field 대신 생략 또는 target-internal handling으로 둔다.
- `ui_spec` core contract는 사람/에이전트가 수정하는 최소 semantic source spec으로 유지하고,
  fallback memo, props enrichment, lookup index 생성은 compiler 책임으로 둔다.

## Root Mapping

### Root Role

| ui_spec field | flutter_ir field | rule |
| --- | --- | --- |
| `root.semantic.role = "screen"` | `screens[]` entry | root 하나를 screen root로 생성 |
| `root.semantic.role = "component"` | `components[]` entry | root 하나를 component root로 생성 |
| `root.semantic.id` | `screen.id` / `component.id` | 필수 |
| `root.name` | `screen.name` / `component.name` fallback | semantic label이 없으면 visual name 사용 |
| `root.semantic.label` | `screen.name` / `component.name` optional supplement | label이 짧고 실제 사용자 의미에 도움이 될 때만 name 우선값 후보 |
| `root.meta.figmaNodeId` | `figmaNodeId` | 있으면 그대로 보존 |

### Screen Root

| ui_spec field | flutter_ir field | note |
| --- | --- | --- |
| `root.semantic.route` | `screen.route` | 직접 매핑 |
| `root.semantic.flow.id` | `screen.root.notes.flowId` | 직접 매핑 |
| `root.semantic.flow.start` | `screen.root.notes.flowStart` | 직접 매핑 |
| `root.semantic.notes` | `screen.root.notes.memo` | 현재 schema는 `notes.memo`만 허용 |

### Component Root

| ui_spec field | flutter_ir field | note |
| --- | --- | --- |
| `root.semantic.component.name` | `component.name` preferred | 없으면 root visual `name` fallback |
| `root.semantic.notes` | `component.root.notes.memo` | 현재 schema 범위에서 memo로 보존 |

## Node Mapping

### Node Identity

| ui_spec field | flutter_ir field | rule |
| --- | --- | --- |
| `node.semantic.id` | `node.id` | semantic id가 있으면 그것을 우선 사용 |
| `node.name` | `node.name` | visual/debug name |
| `node.semantic.label` | `node.notes.memo` or `node.name` supplement | source core contract는 아니며 짧은 식별 문구일 때만 보조 보존 |

`label`/`notes` 관련 아래 규칙은 source 작성 의무를 늘리기 위한 것이 아니라,
이미 존재하는 보조 semantic을 IR에서 잃지 않기 위한 compiler 보존 규칙이다.

### Component Variant Diff Preservation

`ui_spec.componentVariants`는 source-of-truth visual diff이므로 raw design trace와 분리해 다룬다.

| ui_spec field | flutter_ir field | rule |
| --- | --- | --- |
| `node.componentVariants` | `node.props.componentVariants` | direct preserve |
| `node.componentVariants.currentVariant` | `node.props.componentVariants.currentVariant` | direct |
| `node.componentVariants.variants[*].surface` | `node.props.componentVariants.variants[*].surface` | direct |
| `node.componentVariants.variants[*].badge` | `node.props.componentVariants.variants[*].badge` | direct |
| `node.componentVariants.variants[*].text` | `node.props.componentVariants.variants[*].text` | direct |
| `node.componentVariants.variants[*].trailingAction` | `node.props.componentVariants.variants[*].trailingAction` | direct |

원칙:

- 이 필드는 `meta.instanceOf.availableVariants`와 달리 codegen이 직접 신뢰할 수 있는 source-of-truth 보존 레이어다.
- variant별 visual/action 차이는 가능한 한 재서술하지 않고 source 값을 그대로 전달한다.
- current-selection slot, default/selected 같은 앱 의미는 여전히 `semantic` / `state` / interaction이 source-of-truth다.
- `componentVariants`는 그 의미를 보완하는 visual/action diff 계약으로만 사용한다.

### State / Badge Intent Preservation

현재 `flutter_ir v0.1`에는 selected/default/badge role 전용 필드가 약하므로,
compiler는 source에 이미 구조화된 의미를 잃지 않지 않는 선에서만 보조 보존을 수행한다.

| ui_spec source | flutter_ir field | rule |
| --- | --- | --- |
| `node.semantic.label` 또는 `node.semantic.notes`가 이미 `기본 선택`, `선택됨`, `active`, `selected` 같은 state badge 의미를 담고 있음 | `node.notes.memo` | source에 이미 있는 의미를 잃지 않도록 보조 보존 |
| `node.componentVariants.variants[*].badge`가 존재 | `node.props.componentVariants.variants[*].badge` | source-of-truth visual diff로 직접 보존 |

보존 원칙:

- compiler가 visual emphasis만 보고 `selected card`, `default selected item` 같은 새 상태 서술을 만들어 `notes.memo`에 추가하지 않는다.
- 상태 의미는 우선 `semantic` / `state` / structured interaction에서 오고, variant별 badge/shell 차이는 `componentVariants`에서 온다.
- `notes.memo`는 source에 이미 있던 상태 문구나 unresolved 메모를 잃지 않도록 보조 보존할 때만 사용한다.
- 상태 텍스트와 도메인 텍스트를 compiler가 재조합해 새 의미를 만들지 않는다.
- `flutter_ir v0.2`의 `node.state`는 source의 명시 `ui_spec.state`에서만 내리고, `label`/visible text 기반 자동 추론으로 새 state를 만들지 않는다.

### Unresolved Action Preservation

실제 interactive node이지만 target route, submit contract, component target이 아직 정해지지 않은 경우가 있다.

| ui_spec source | flutter_ir field | rule |
| --- | --- | --- |
| `semantic.id`, `semantic.type`, 선택적 `semantic.label`만 있고 structured `onTap`이 비어 있음 | `node.id`, `node.type`, `node.notes.memo` | interactive identity는 유지하고 unresolved 사유가 있으면 memo에 보존 |
| `semantic.notes`에 `target unresolved`, `submit contract pending`, `fallback inference required` 성격의 문구가 있음 | `node.notes.memo` | direct target이 없더라도 fallback-required 상태를 잃지 않게 보존 |

처리 원칙:

- compiler는 unresolved action이라고 해서 `node.id`나 `node.type`을 버리지 않는다.
- direct `navigate` edge나 top-level `interactions[]`는 생성하지 않는다.
- downstream codegen은 이 경우 local stub, TODO, disabled branch, no-op을 선택할 수 있지만 route를 추측해서 생성하지 않는다.
- unresolved fallback 보존은 compiler 책임이며, source 작성 단계에서 메모 태그를 과도하게 채우는 것을 요구하지 않는다.

### Semantic Type To IR Node Type

현재 `flutter_ir v0.1`는 node `type` enum이 제한적이므로,
semantic type과 visual 구조를 조합해 아래처럼 내린다.

| ui_spec source | flutter_ir field | rule |
| --- | --- | --- |
| visual layout root `FRAME` + auto layout vertical | `node.type = "column"` | visual 구조 우선 |
| visual layout root `FRAME` + auto layout horizontal | `node.type = "row"` | visual 구조 우선 |
| `node.semantic.type = row` | `node.type = "row"` | visual layout enum이 불충분하거나 absolute frame이어도 semantic row를 보존 |
| `node.semantic.type = column` | `node.type = "column"` | visual layout enum이 불충분하거나 absolute frame이어도 semantic column을 보존 |
| visual absolute frame | `node.type = "frame"` or `stack` | visual 구조 우선 |
| `node.semantic.type = button` | `node.type = "button"` preferred if tappable root | semantic이 visual enum보다 더 적합하면 승격 |
| `node.semantic.type = radio` | `node.type = "button"` + selection memo | direct enum은 없으므로 tappable selection control로 정규화 |
| `node.semantic.type = checkbox` | `node.type = "button"` + selection memo | direct enum은 없으므로 tappable selection control로 정규화 |
| `node.semantic.type = tab` | `node.type = "button"` + selection memo | direct enum은 없으므로 tappable selection control로 정규화 |
| `node.semantic.type = list` | `node.type = "list"` | 직접 매핑 가능 |
| `node.semantic.type = pageView` | `node.type = "pageView"` | 직접 매핑 가능 |
| `node.semantic.type = icon` | `node.type = "icon"` | 직접 매핑 가능 |
| `node.semantic.type = image` | `node.type = "image"` | 직접 매핑 가능 |
| `node.semantic.type = heading`, `label`, `buttonLabel` | `node.type = "text"` | semantic detail은 별도 note/props로 보존 후보 |

Flutter target 원칙:

- `flutter_ir.node.type`은 Flutter widget 선택에 필요한 수준으로 정규화한다.
- `semantic.type`의 세부값은 `flutter_ir v0.1`에 새 field가 없으면 직접 보존하지 않는다.
- 단, `row` / `column`은 세부 semantic이 아니라 layout intent로 간주하고 가능한 한 `node.type`에 직접 보존한다.
- `ui_spec`에서 semantic row/column이 명시된 경우, compiler는 absolute visual frame이라는 이유만으로 이를 `frame`으로 낮추지 않는다.
- 같은 parent 아래 자식들이 동일 축에 정렬된 group라면 semantic row/column을 우선 보존하고, 개별 child의 `style.x/y/width/height`는 보조 layout signal로 함께 유지한다.
- selected/default 같은 state intent는 전용 schema field가 없더라도 시각 토큰과 텍스트 단서를 memo 수준에서 보조 보존한다.
- `radio` / `checkbox` / `tab`처럼 선택형 control은 direct enum이 없더라도 generic `frame`으로 떨어뜨리지 말고 최소한 tappable `button` 계열로 승격한다.
- 선택용 card/list row는 visual이 list item이어도 navigation row와 selection row를 같은 memo로 뭉개지지 않게 한다.

### Explicit State Mapping

`flutter_ir v0.2`에서 `node.state`는 source의 명시 state를 보존하는 용도로만 사용한다.

| ui_spec field | flutter_ir field | rule |
| --- | --- | --- |
| `node.state.selected` | `node.state.selected` | direct preserve |
| `node.state.checked` | `node.state.checked` | direct preserve |
| `node.state.default` | `node.state.default` | direct preserve |
| `node.state.active` | `node.state.active` | direct preserve |
| `node.state.disabled` | `node.state.disabled` | direct preserve |

원칙:

- compiler는 `semantic.label`, visible text, badge text만 보고 `node.state`를 자동 생성하지 않는다.
- state가 source에 없으면 `node.state`를 비운 채 두고, 필요한 visual fallback은 codegen이 `componentVariants`, style, badge 텍스트를 참고해 처리한다.
- 같은 상태 의미가 `node.state`와 `componentVariants.variants[*].state`에 중복될 수는 있지만, 전자는 현재 node의 명시 runtime state이고 후자는 variant diff 설명 레이어다.

## Interaction Mapping

### Inline Node Interaction

| ui_spec field | flutter_ir field | status |
| --- | --- | --- |
| `semantic.interaction.onTap` | `node.interaction.onTap` | direct |
| `semantic.navigation.mode` | `node.interaction.navigation.mode` | direct |
| `semantic.interaction.scroll` | `node.interaction.scroll` | direct |
| `semantic.interaction.gesture` | `node.interaction.gesture` | direct |
| `semantic.interaction.carousel` | `node.interaction.carousel` | direct |

보조 규칙:

- 부모 `textField` 안에 trailing action child가 별도 semantic을 가지면 child node interaction을 독립적으로 보존한다.
- unresolved action으로 `semantic.interaction`이 비어 있는 node는 interaction-less interactive node로 남기되, `notes.memo`에 unresolved 상태를 싣는다.
- 동일 visual field 내부에 있는 trailing action이라고 해서 부모 field interaction으로 합치지 않는다.

### Top-level Interaction Index

node에 interaction이 있으면 top-level `interactions[]`도 함께 생성한다.

생성 규칙:

- `id`: `i_<targetNodeId>_<kind>`
- `targetNodeId`: 해당 node id
- `sourceRootId`: 현재 screen/component root id
- `sourceRootName`: 현재 root name
- `payload`: node의 `interaction` 객체

이유:

- 현재 codegen 가이드가 top-level `interactions[]` 인덱스를 이미 기대한다.
- node 내부 interaction만 두면 closure 계산과 cross-reference lookup이 약해진다.

### onTap Type Mapping

| ui_spec field | flutter_ir v0.1 | note |
| --- | --- | --- |
| `onTap.type = navigate` | `onTap.type = navigate` | direct |
| `onTap.type = openModal` | `onTap.type = openModal` | legacy와 동일 |
| `onTap.type = toggle` | `node.interaction.onTap.type = toggle` | direct preserve if schema/runtime allows, otherwise schema gap으로 명시 |
| `onTap.type = select` | `node.interaction.onTap.type = select` | direct preserve if schema/runtime allows, otherwise schema gap으로 명시 |
| `onTap.type = open_component` | `node.interaction.onTap.type = openComponent` or schema gap note | `componentRef`와 함께 preserve 우선 |

현재 Flutter target 결정:

- `navigate`, `openModal`, `none`은 직접 매핑한다.
- `toggle`, `select`, `open_component`는 source/runtime 의미가 크므로 memo-only로 축소하지 않는 것을 원칙으로 한다.
- 현재 schema 또는 exporter 구현이 이를 완전히 실어 나르지 못하면, 그 사실을 compiler/schema gap으로 명시하고 direct preserve 방향을 우선 설계한다.

추가 원칙:

- `toggle` / `select` / `open_component`는 note-only fallback을 기본값으로 삼지 않는다.
- 불가피하게 임시 보존이 필요하면 "현재 schema gap 때문에 축소 보존됨"을 드러내고, downstream guide가 이미 직접 지원한다고 오인하지 않게 한다.
- 선택형 필터 칩, 선택 카드, dismiss chip처럼 local selection 상태를 바꾸는 affordance는 direct navigation이 없더라도 interaction candidate로 취급한다.

## Navigation Mapping

| ui_spec field | flutter_ir field | rule |
| --- | --- | --- |
| `semantic.navigation.mode = push` | `interaction.navigation.mode = push` | direct |
| `semantic.navigation.mode = replace` | `interaction.navigation.mode = replace` | direct |
| `semantic.navigation.mode = reset` | `interaction.navigation.mode = reset` | direct |

`navigation.mode`는 destination root가 아니라 trigger node의 interaction에 붙인다.

## Component Reference Mapping

### Reusable Component Definition

| ui_spec field | flutter_ir field | rule |
| --- | --- | --- |
| `root.semantic.role = component` | `components[]` | root component 생성 |
| `root.semantic.id` | `component.id` | direct |
| `root.semantic.component.name` | `component.name` | preferred |

### Component Instance Reference

| ui_spec field | flutter_ir field | note |
| --- | --- | --- |
| `node.semantic.componentRef.id` | `node.props.componentRootId` | direct |
| referenced component root name lookup | `node.props.componentRootName` | compiler가 lookup으로 채움 |
| visual node/component name | `node.props.componentName` | 선택적, legacy parity용 보존 |
| `node.meta.instanceOf.componentId` | `node.props.designInstance.componentId` | extracted instance 원문 보존 |
| `node.meta.instanceOf.componentName` | `node.props.designInstance.componentName` | extracted instance 원문 보존 |
| `node.meta.instanceOf.componentDescription` | `node.props.designInstance.componentDescription` | extracted instance 설명 원문 보존 |
| `node.meta.instanceOf.componentDescriptionMarkdown` | `node.props.designInstance.componentDescriptionMarkdown` | extracted instance 설명 원문 보존 |
| `node.meta.instanceOf.componentSetId` | `node.props.designInstance.componentSetId` | extracted instance 원문 보존 |
| `node.meta.instanceOf.componentSetName` | `node.props.designInstance.componentSetName` | extracted instance 원문 보존 |
| `node.meta.instanceOf.componentSetDescription` | `node.props.designInstance.componentSetDescription` | extracted component set 설명 원문 보존 |
| `node.meta.instanceOf.componentSetDescriptionMarkdown` | `node.props.designInstance.componentSetDescriptionMarkdown` | extracted component set 설명 원문 보존 |
| `node.meta.instanceOf.variantProperties` | `node.props.designInstance.variantProperties` | raw variant property 보존 |
| `node.meta.instanceOf.availableVariants` | `node.props.designInstance.availableVariants` | variant 목록 원문 보존 |
| allowlist variant key (`state/status`, `kind/role`) | `node.props.designInstance.runtimeHints` | codegen 보조 힌트만 제한적으로 승격 |

현재 Flutter codegen은 `props.componentRootId` lookup을 이미 사용하므로
이 필드는 유지 대상이다.

추가 원칙:

- `designInstance`는 source-of-truth라기보다 design-system trace 레이어다.
- `componentVariants`는 trace가 아니라 source-of-truth variant diff 레이어다.
- `runtimeHints`는 정식 `node.semantic`, `node.state`, `interaction`이 비어 있을 때만 보조 입력으로 사용한다.
- `availableVariants` 전체를 exporter나 codegen이 앱 상태 머신으로 직접 해석하지 않는다.
- Figma component/variant description도 trace 메타로 보존할 수 있지만, exporter가 설명 문구만 보고 새로운 state/semantic field를 자동 생성하지는 않는다.
- variant 차이가 런타임 의미를 가지면 그 source-of-truth는 여전히 `ui_spec`의 `semantic` / `state` / structured interaction이며, `designInstance`는 이를 대체하지 않는다.
- 따라서 설계 우선순위는 "앱 의미는 기존 semantic/state 계약으로 정규화" + "variant별 visual/action diff는 `componentVariants`로 source에서 명시"다.

## Flow Mapping

### Root Notes

| ui_spec field | flutter_ir field | rule |
| --- | --- | --- |
| `screenRoot.semantic.flow.id` | `screen.root.notes.flowId` | direct |
| `screenRoot.semantic.flow.start` | `screen.root.notes.flowStart` | direct |

### Top-level `flows[]`

생성 규칙:

1. `flow.start = true`인 screen root를 시작점으로 수집
2. interaction 중 `navigate` 성격의 edge를 screen-level edge로 정규화
3. start screen 기준 reachable edge를 묶어 `flows[]` 생성
4. `flow.id`가 없으면 `main` fallback

edge 생성 최소 조건:

- source root가 `screen`
- target route 또는 destination root가 `screen`
- trigger node에 stable semantic id 존재

edge shape:

```json
{
  "id": "screen_home__screen_settings__cta_settings__NAVIGATE",
  "fromScreenId": "screen_home",
  "toScreenId": "screen_settings",
  "triggerNodeId": "cta_settings",
  "navigation": "NAVIGATE"
}
```

## Notes Mapping

현재 `flutter_ir v0.1`의 `node.notes`는 아래만 허용한다.

- `memo`
- `sourceMetaNodeId`
- `flowStart`
- `flowId`

따라서 `ui_spec.semantic.label`, 세부 semantic type, unsupported interaction intent는
직접 보존 필드가 없다.

현재 Flutter target 정책:

- 중요한 자연어 설명은 `notes.memo`로 축약 보존 가능
- 구조화 reference는 가능한 한 `interaction`, `flows[]`, `props.componentRootId` 쪽에 먼저 실는다.
- unresolved action, selection intent, trailing action 분리 정보처럼 direct field가 없는 semantic은 `notes.memo`로라도 손실을 줄인다.

## Optional Enrichment: Tokens And Assets Mapping

### Tokens

| ui_spec field | flutter_ir field | status |
| --- | --- | --- |
| `semantic.tokenRefs.*` | root-level `tokens` registry | partial |
| 실제 token 값 registry가 `ui_spec` top-level에 존재 | `flutter_ir.tokens` | direct |
| node-level 어떤 token을 참조하는지 | direct field 없음 | schema 확장 또는 compiler-internal only |

현재 Flutter target 결정:

- `flutter_ir.tokens`는 top-level registry 값이 있을 때만 채운다.
- node-level `tokenRefs`는 `flutter_ir v0.1`에 직접 싣지 않는다.
- compiler 구현에서 style 계산 참고용 내부 데이터로만 사용할 수 있다.
- 따라서 node-level `tokenRefs`는 현재 `ui_spec` core authoring contract로 요구하지 않는다.

### Assets

| ui_spec field | flutter_ir field | status |
| --- | --- | --- |
| `semantic.assetRefs` | top-level `assets[]` | partial |
| 실제 asset registry가 `ui_spec` top-level에 존재 | `flutter_ir.assets[]` | direct |
| node-level asset reference | `node.props` 또는 visual field로 간접 반영 | partial |

현재 Flutter target 결정:

- asset registry가 있으면 `assets[]`를 채운다.
- node-level `assetRefs`는 직접 보존보다 visual `svgUrl`, `image url`, icon source를 우선 사용한다.
- 따라서 node-level `assetRefs`도 현재 `ui_spec` core authoring contract로 요구하지 않는다.

## Visual Mapping Baseline

이 문서는 semantic 중심이지만 compiler output을 만들려면 visual field도 아래 수준으로 정규화해야 한다.

- layout direction -> `node.type = row|column`
- rectangle/frame decoration -> `style`
- text content -> `props.text`
- fills/strokes/effects -> `style`
- image/svg/icon source -> `props` 또는 `assets[]`

### Selected / Default Visual Token Baseline

- card/container에 selected/default state를 나타내는 stroke, fill, accent color, check badge가 있으면 compiler는 이를 일반 decoration으로만 보지 말고 상태 단서로 취급한다.
- selected/default 상태를 암시하는 텍스트 badge가 있으면 해당 text node를 그대로 보존한다.
- selected/default 상태의 대표 accent color가 분명하면 style 값은 가능한 한 그대로 유지한다.
- schema 제약 때문에 상태 의미를 새 field로 못 싣더라도, selected/default 여부를 추론할 수 있는 시각 단서 묶음은 함께 남긴다.

### Background Effect Preservation Baseline

- ambient gradient, blurred glow circle, decorative light bloom 같은 background effect는 필수 UI보다 낮은 우선순위의 시각 레이어로 본다.
- 그러나 screen atmosphere에 기여하는 background effect node는 가능하면 `style`과 `notes.memo` 수준에서 완전히 버리지 않는다.
- background effect는 semantic role이 없어도 `background glow`, `decorative blur`, `ambient gradient` 같은 짧은 memo 보존을 허용한다.
- 복잡한 blend/mask/compositing detail은 direct field가 없으면 생략 가능하지만, 위치/크기/색/blur 반경 같은 핵심 시각 단서는 가능한 한 유지한다.
- compiler는 background effect를 필수 interactive node로 승격하지 않는다. 목적은 기능 해석이 아니라 후면 장식 레이어 단서 보존이다.

세부 visual mapping은 compiler 구현 단계에서 별도 문서나 코드로 확정한다.

### Row/Column Preservation Baseline

- `ui_spec.semantic.type = row|column`이 있으면 compiler는 이를 1차 layout intent로 간주한다.
- visual auto layout 정보가 없더라도 semantic row/column은 가능한 한 `flutter_ir.node.type`에 직접 반영한다.
- semantic row/column도 없고 visual auto layout도 없는 경우에만 자식들의 좌표 패턴을 fallback으로 사용한다.
- fallback row 판단 최소 신호:
  - 같은 parent 아래 sibling 2개 이상
  - 각 sibling의 `y` 또는 vertical center가 거의 같음
  - `x`가 증가 순서로 배치됨
  - child width/height가 반복되거나 작은 control group 패턴을 가짐
- fallback column 판단 최소 신호:
  - 같은 parent 아래 sibling 2개 이상
  - 각 sibling의 `x` 또는 horizontal center가 거의 같음
  - `y`가 증가 순서로 배치됨
- chip/filter/segmented control처럼 small pill button group은 semantic row가 있으면 반드시 `node.type = "row"` 또는 동등한 horizontal group으로 보존하는 것을 우선한다.
- compiler가 row/column으로 확정하지 못한 경우에만 `frame` 또는 `stack`으로 둔다.

### Header Cluster To App Bar Candidate

- source root 또는 상단 근처 sibling 집합에서 leading(back/menu) affordance, title 영역, trailing action이 함께 관찰되면 compiler는 이를 `header cluster` 후보로 먼저 묶어 해석할 수 있다.
- source semantic이 이미 `app bar` 또는 동등한 상위 header 의미를 주면 그 의미를 우선 보존한다.
- source semantic이 없더라도 상단 cluster의 1차 역할이 현재 위치 표시와 navigation/action affordance 제공으로 읽히면 `appBar candidate`로 승격할 수 있다.
- 단, hero, intro, summary, decorative band 근거가 더 강하면 `appBar candidate`로 강제 승격하지 않는다.
- candidate 승격 시에도 subtitle, padding, button shell, fill/stroke/shadow 같은 핵심 시각 토큰은 보존 가능한 정보로 함께 전달한다.
- 이 규칙은 codegen 강제용 확정 semantics가 아니라 downstream 해석 안정화를 위한 구조 후보 보존 규칙으로 사용한다.

## Parity Baseline With Legacy Exporter

첫 parity 비교는 아래 범위를 맞춘다.

1. screen/component root 분리
2. route
3. flow start / flow id / `flows[]`
4. tap navigate + navigation mode
5. scroll / swipe / carousel.loop
6. component instance reference via `componentRootId`
7. top-level `interactions[]`

초기 parity 비교에서 제외:

- natural-language interaction 추론
- prototype transition 세부값 1:1 복원
- tokenRefs / assetRefs의 완전 보존
- unsupported semantic action (`toggle`, `open_component`)

## Flutter Compiler Output Rules

phase 1 compiler는 아래를 만족해야 한다.

- `version = "0.1"`
- `screens[]`, `components[]`, `interactions[]`, `flows[]`를 항상 채운다.
- `navigate` interaction이 있으면 node inline + top-level interaction ref를 함께 만든다.
- `flow.start`가 있으면 `screen.root.notes.flowStart`와 `flows[].startScreenId`를 함께 만든다.
- component ref가 있으면 `props.componentRootId`를 채운다.
- semantic row/column 또는 strong coordinate row/column pattern이 있으면 `node.type`에 `row|column`을 직접 반영한다.

## Known Gaps Against flutter_ir v0.1

현재 `ui_spec` source semantic과 `flutter_ir v0.1` 사이의 대표적인 차이:

1. `semantic.type`의 세부 semantic 분류를 직접 보존할 필드가 부족하다.
2. `toggle`, `open_component` 같은 action type이 schema enum에 없다.
3. node-level `tokenRefs` / `assetRefs`를 직접 보존할 필드가 없다.
4. semantic label 전용 필드가 없다.

결론:

- phase 1 compiler는 `flutter_ir v0.1` 호환을 우선한다.
- 위 항목들은 schema v0.2 후보로 관리한다.

## Immediate Next Sample Set

매핑 검증용 parity sample은 최소 3종으로 정의한다.

1. `screen -> screen navigate` 샘플
2. `screen -> component reference` 샘플
3. `flow start + swipe/list` 샘플
