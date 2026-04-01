# Semantic Preservation

이 문서는 `ui_spec`에 더 디테일하게 기록된 semantic 정보를
`ui_spec -> flutter_ir` 변환 시 가능한 범위 안에서 최대한 반영하기 위한
compiler 설계안이다.

전제:

- input source of truth는 `ui_spec`
- target schema는 우선 `flutter_ir v0.1`
- schema가 허용하지 않는 정보는 direct field 대신
  `node.type`, `props`, `notes`, top-level `interactions[]`, `flows[]`로 우회 보존한다
- direct field도 없고 안전한 우회 보존도 어려운 항목만 생략한다
- 이 우회 보존 전략은 compiler 단계 책임이며, `ui_spec` core authoring contract 자체를 늘리는 근거로 사용하지 않는다

## Goal

- semantic을 써도 IR에서 대부분 사라지는 문제를 줄인다.
- mapping draft에 적은 규칙이 실제 compiler 구현 우선순위로 연결되게 한다.
- `flutter_ir v0.1` 호환을 유지하면서도 semantic fidelity를 높인다.

## Current Gap

현재 변환 구현은 아래를 이미 반영한다.

- root `role`, `id`, `route`, `flow`, `component.name`
- node `semantic.id`
- 일부 `semantic.type`
- `interaction.onTap`, `navigation.mode`, `scroll`, `gesture`, `carousel`
- `componentRef.id`
- 일부 `label`, `notes`

하지만 아래는 아직 문서 대비 약하다.

- `semantic.type = row|column` 직접 반영 미흡
- `heading`, `label`, `buttonLabel`, selected/default 상태 의미의 보존 기준 부족
- `open_component`, `toggle`의 partial preservation 규칙 부재
- semantic label/note를 어떤 우선순위로 `name`/`notes.memo`에 싣는지 모호
- semantic quality가 높아져도 export 결과가 그만큼 따라주지 못하는 구간 존재

## Design Principle

우선순위는 아래 순서로 둔다.

1. direct field 보존
2. target widget 선택에 직접 영향을 주는 정규화 보존
3. cross-reference lookup 가능성 보존
4. `notes.memo`를 이용한 최소 의미 보존
5. 정말 방법이 없을 때만 생략

즉 semantic 정보는 "지원하지 않으면 버린다"가 아니라
"어디에 실을 수 있는지 먼저 찾는다"가 기본 원칙이다.

단, 이 원칙은 exporter/compiler의 보존 책임에 대한 설명이다.
source `ui_spec` 작성 기준은 여전히 최소 semantic contract를 우선한다.

## Preservation Tiers

### Tier 1. Direct Mapping

직접 필드가 있는 항목은 우선 direct mapping 한다.

- root `role`, `id`, `route`
- root `flow.id`, `flow.start`
- root `component.name`
- node `semantic.id`
- `interaction.onTap`
- `navigation.mode`
- `scroll`, `gesture`, `carousel`
- `componentRef.id`
- top-level `tokens`, `assets`

### Tier 2. Structural Normalization

direct field가 없더라도 widget/layout 해석에 중요한 semantic은
IR 구조 필드로 정규화한다.

- `semantic.type = row` -> `node.type = "row"`
- `semantic.type = column` -> `node.type = "column"`
- `semantic.type = button` -> `node.type = "button"` 우선
- `semantic.type = list` -> `node.type = "list"`
- `semantic.type = pageView` -> `node.type = "pageView"`
- `semantic.type = image|icon` -> 해당 `node.type`
- `semantic.type = heading|label|buttonLabel` -> `node.type = "text"` + memo/name 보조 보존

핵심:

- `row|column`은 세부 semantic이 아니라 layout intent로 취급한다.
- visual auto layout보다 semantic이 더 명시적이면 semantic을 우선한다.
- coordinate fallback은 semantic과 visual auto layout이 둘 다 없을 때만 쓴다.

### Tier 3. Reference Preservation

semantic이 직접 enum에 안 들어가도 참조 관계는 잃지 않는다.

- `onTap.targetId`는 가능하면 lookup 가능한 root/node id 기준으로 유지
- route lookup 가능 시 `onTap.to`를 route로 정규화
- `open_component`는 direct enum이 없더라도 component reference를 보존

정책:

- `open_component`를 node inline interaction에서 완전히 버리지 않는다.
- 최소한 아래 둘 중 하나는 남긴다.
  - `props.componentRootId`
  - `notes.memo`에 `open_component:<id>` 형태의 짧은 보존 메모

### Tier 4. Intent Memo Preservation

schema direct field가 없지만 codegen 또는 후속 validator가 참고할 수 있는 의미는
`notes.memo`에 짧게 보존한다.

대상:

- `semantic.label`
- selected/default/active 상태 의미
- `toggle` intent
- `open_component` intent
- `heading`, `buttonLabel` 같은 text subtype
- background/decorative layer 의미

원칙:

- memo는 짧고 기계적으로 읽기 쉬워야 한다.
- 도메인 텍스트를 다시 창작하지 않는다.
- 자유서술보다 tag-like phrasing을 우선한다.

예:

- `semantic:heading`
- `semantic:buttonLabel`
- `state:selected`
- `state:default`
- `action:toggle`
- `action:open_component:component_filter_chip`
- `decorative:background_glow`

주의:

- 이런 memo tag는 compiler fallback 레이어다.
- source `ui_spec` 작성 단계에서 이 tag를 미리 많이 채우는 것을 권장하지 않는다.

## Field-by-Field Design

### 1. `semantic.type`

반영 우선순위:

1. `row|column|button|list|pageView|image|icon`이면 `node.type` 우선 반영
2. `heading|label|buttonLabel|listItem|appBar`면 direct enum이 없어도
   `node.name` 또는 `notes.memo`에 subtype 단서 보존
3. unknown type은 visual mapping을 유지하고 `notes.memo`에 `semantic:<type>` 보존

### 2. `semantic.label`

반영 정책:

- `label`은 source 필수값이 아니라 보조 식별 문구다.
- root label은 `screen.name` / `component.name` 우선값 후보가 될 수 있다.
- node label은 `node.name`이 비어 있을 때만 fallback 후보로 보고, 기본은 `notes.memo`에 보조 보존한다.

충돌 규칙:

- visual `name`이 디버깅에 더 유용하고 semantic label이 사용자 의미에 가까우면
  visual `name`은 유지하고 label은 `notes.memo`로 보존한다.

### 3. `semantic.notes`

반영 정책:

- `notes`도 source 필수값이 아니라 unresolved 설명이나 보충 맥락을 위한 보조 필드로 본다.
- root/node 모두 `notes.memo` 우선
- label과 notes가 모두 있으면 `notes` 우선, label은 병합 또는 fallback
- memo 병합 시 한 줄 단위의 짧은 토큰으로 합친다

예:

- `설정 버튼 | semantic:button`
- `기본 선택 | state:default`

### 4. `semantic.interaction.onTap`

지원 정책:

- `navigate`는 현재처럼 direct
- `none`은 direct
- `open_component`는 partial preservation
- `toggle`는 partial preservation

partial preservation 규칙:

- `open_component`
  - `props.componentRootId`가 가능하면 채움
  - `notes.memo`에 `action:open_component:<id>` 보존
- `toggle`
  - `notes.memo`에 `action:toggle`
  - selected/default 상태 단서가 있으면 함께 `state:*` memo 보존

### 5. `semantic.navigation.mode`

현재 direct mapping 유지.

추가 규칙:

- `navigation.mode`가 있는데 `onTap`이 없으면 warning 대상
- direct field로 싣되 validator에서 orphan rule을 경고

### 6. `semantic.componentRef`

현재 `props.componentRootId` direct mapping 유지.

추가 반영:

- lookup 성공 시 `componentRootName` 유지
- node `notes.memo`에 `ref:component:<id>`를 선택적으로 보조 보존 가능
- `open_component`와 함께 있으면 interaction intent memo도 함께 보존

### 7. `semantic.tokenRefs` / `assetRefs`

`flutter_ir v0.1`에 direct node-level field가 부족하므로 아래처럼 처리한다.

- top-level registry는 현재처럼 direct merge
- node-level reference는 `props.tokenRefs` / `props.assetRefs`로 partial preservation 후보

정책:

- schema가 `props` 자유 객체를 허용하므로 compiler는 node-level reference를
  `props.tokenRefs`, `props.assetRefs`로 실어도 된다.
- codegen이 아직 사용하지 않더라도 semantic 손실 방지용으로 우선 보존한다.
- 그러나 이 보존 전략 때문에 source `ui_spec` authoring contract에 node-level reference 작성을 기본 요구로 올리지는 않는다.

예:

```json
{
  "props": {
    "tokenRefs": {
      "color": ["color.primary"]
    },
    "assetRefs": ["icon.settings"]
  }
}
```

### 8. State Intent

selected/default/active/checked 의미는 direct schema field가 없으므로
아래를 조합해 보존한다.

- 원래 visual style 유지
- 관련 badge/text 유지
- `notes.memo`에 `state:selected`, `state:default`, `state:checked` 보존

이 정책은 chip, filter, card selection 같은 codegen 해석 안정성에 중요하다.

## Implementation Order

### Step 1. Type Preservation Upgrade

먼저 아래를 구현한다.

- `semantic.type = row|column` direct support
- `semantic.type` unknown fallback memo
- `heading|label|buttonLabel|appBar|listItem` subtype memo 보존

이 단계가 가장 효과가 크다.

### Step 2. Interaction Intent Upgrade

- `open_component` partial preservation
- `toggle` partial preservation
- orphan navigation warning 설계

### Step 3. Node-level Reference Preservation

- `props.tokenRefs`
- `props.assetRefs`
- optional `ref:component:*` memo

설명:

- 이 단계는 compiler enrichment 단계다.
- source `ui_spec`가 이 정보를 항상 제공한다고 가정하지 않는다.

### Step 4. Validator / Warning Layer

export 시 warning을 함께 생성한다.

예:

- `navigation.mode without onTap`
- `open_component without componentRef.id or targetId`
- `interactive visual candidate missing semantic.id`
- `semantic.type unknown; preserved as memo only`

warning은 우선 로그 또는 export response에 붙이고,
hard failure는 최소화한다.

## Suggested Compiler Helpers

필요 helper:

- `normalizeSemanticType(semantic, specNode)`
- `buildSemanticMemo(semantic, specNode, options)`
- `extractSemanticRefs(semantic)`
- `mergeMemoParts(...parts)`
- `collectSemanticWarnings(specNode, semantic, path)`

현재 변환 코드 구조상 아래 함수에 반영하면 된다.

- `inferNodeType`
- `extractNodeProps`
- `extractInteraction`
- `createNodeConverter`

## Backward Compatibility

- `flutter_ir.version`은 계속 `0.1`
- 기존 codegen이 읽는 필드는 유지
- 새 보존 값은 `props.*` 또는 `notes.memo`에 추가해도 기존 consumer를 깨지 않는다

즉 phase 1 목표는 schema upgrade가 아니라
기존 schema 안에서 semantic preservation을 최대화하는 것이다.

## Minimal Success Criteria

이 설계가 구현되면 최소한 아래가 성립해야 한다.

1. semantic row/column이 IR에서 실제 `node.type`으로 살아남는다.
2. `open_component`, `toggle`도 완전 소실되지 않고 partial signal이 남는다.
3. `label`, subtype, state intent가 `notes.memo` 또는 `name`으로 남는다.
4. node-level `tokenRefs` / `assetRefs`가 `props` 수준에서라도 보존된다.
5. semantic detail을 많이 넣을수록 IR fidelity가 실제로 올라간다.

## Out Of Scope

이번 설계에서 바로 하지 않는 것:

- `flutter_ir v0.2` schema 변경
- direct widget state schema 추가
- full semantic validator UI
- plugin node-level semantic editor 구현 세부

이 문서의 목적은 현재 `v0.1` 경계 안에서
"쓸 수 있는 semantic은 최대한 IR에 실어보내는 것"이다.
