# ui_spec -> target_ir Baseline

이 문서는 `compilers/` 하위 모든 target compiler가 공유하는 공통 설계 기준이다.

## Goal

- `ui_spec`를 공통 source spec으로 사용한다.
- target별 IR(`flutter_ir`, 이후 `android_ir`, `ios_ir`)로 내려갈 때 공통 해석 규칙을 고정한다.
- target별 문서에는 schema/플랫폼 제약과 전용 매핑만 남긴다.

## Compiler Boundary

기본 단계:

1. `ui_spec`
2. `target_ir`
3. target-specific codegen

원칙:

- direct `ui_spec -> project code`는 하지 않는다.
- compiler는 `ui_spec`의 semantic intent를 target-independent 방식으로 해석한 뒤 target IR로 정규화한다.
- codegen은 target IR를 입력으로 본다.

## Source Of Truth

- visual structure와 semantic intent의 1차 source는 `ui_spec`
- Figma는 projection/editor
- `meta`는 round-trip trace용 보조 정보
- compiler 주 입력은 `semantic`

## Common Semantic Decisions

현재 baseline:

- semantic namespace: `semantic`
- 저장 방식: node inline
- root role: `screen` / `component`
- stable id: `semantic.id`

이 baseline은 target별 compiler가 공유한다.

## Root Interpretation

### Screen Root

`root.semantic.role = "screen"`이면 target IR의 screen/page/root entry로 본다.

공통 의미:

- app route entry가 될 수 있다.
- flow 소속과 시작점이 될 수 있다.
- 다른 screen으로의 navigation source/target가 된다.

### Component Root

`root.semantic.role = "component"`이면 target IR의 reusable component entry로 본다.

공통 의미:

- 다른 root 내부에서 reference 가능
- 독립 route entry가 아니다
- target codegen에서는 재사용 widget/view/component 단위가 된다

## Identity Rules

- semantic 의미가 있는 root/node는 `semantic.id`를 가져야 한다.
- `semantic.id`는 문서 안에서 유일해야 한다.
- target compiler는 가능한 한 visual node id나 position이 아니라 `semantic.id`를 기준으로 reference를 만든다.

## Common Semantic Domains

target별 이름은 달라도, 아래 의미는 공통으로 유지한다.

### Route

- `semantic.route`
- screen root에만 적용
- target IR의 route/screen identifier로 해석

### Flow

- `semantic.flow.id`
- `semantic.flow.start`
- screen-level navigation graph의 공통 입력

### Interaction

초기 공통 범위:

- `onTap`
- `scroll`
- `gesture`
- `carousel`

공통 원칙:

- interaction은 trigger node에 붙는다.
- destination semantics가 아니라 trigger intent를 기준으로 해석한다.

### Navigation Semantics

- `semantic.navigation.mode`
- `push`, `replace`, `reset` 의미를 공통으로 사용

### Component Reference

- `semantic.componentRef.id`
- node가 reusable component root를 참조한다는 의미

### Token / Asset Reference

- `semantic.tokenRefs`
- `semantic.assetRefs`

공통 의미는 유지하되, target IR가 직접 보존하지 못하면 compiler-internal data로만 사용할 수 있다.

## Common Mapping Policy

- visual field와 semantic field를 섞어 해석하지 않는다.
- visual field는 layout/style/asset source 변환에 사용한다.
- semantic field는 route/interaction/flow/component closure 계산에 사용한다.
- 구조화 semantic 정보가 있으면 natural-language memo보다 우선한다.
- 추론은 명시값이 없을 때만 제한적으로 사용한다.

## Meta Policy

`meta`는 공통적으로 아래 역할만 가진다.

- Figma round-trip trace
- source node 추적
- warning/debug context

compiler 규칙:

- `meta`는 semantic source of truth가 아니다.
- semantic이 있으면 `meta`보다 우선한다.
- 필요 시 target IR에 trace field로만 보존한다.

## Common Output Expectations

target IR는 형태가 달라도 아래는 공통으로 충족해야 한다.

- screen root와 component root를 명시적으로 분리
- root/node stable reference를 유지
- navigation/interaction lookup 가능한 구조를 제공
- flow graph 또는 그에 준하는 screen graph를 제공
- component reference closure 계산이 가능해야 함

## Fallback Policy

- 구조화 field가 있으면 그것을 우선 사용
- 구조화 field가 없고 memo가 있으면 memo를 참고
- 둘 다 없을 때만 target baseline fallback 적용

## Parity Policy

legacy exporter와의 초기 parity 범위:

1. root 분리
2. route
3. flow start / flow id
4. navigation mode
5. screen-level graph
6. component reference
7. top-level interaction index

초기 parity에서 제외 가능한 항목:

- 자연어 추론의 세부 품질
- platform-specific visual fidelity
- schema에 아직 없는 semantic subtype 보존

## Target-specific Documents

각 target compiler 문서는 아래만 추가로 다룬다.

- target IR schema 제약
- target IR field names
- target 전용 enum / node type 정규화
- target codegen이 기대하는 lookup keys
- target-specific unsupported cases

즉, 공통 규칙 변경은 먼저 이 문서에서 다루고,
target 전용 매핑은 각 compiler 폴더 문서에서 다룬다.
