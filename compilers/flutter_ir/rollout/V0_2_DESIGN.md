# flutter_ir v0.2 Design

이 문서는 `flutter_ir v0.1`에서 우회 보존하던 semantic 중
codegen 해석에 실제로 중요한 항목을 `v0.2`에서 정식 계약으로 승격하는 설계 초안이다.

## Goal

- `ui_spec`의 richer semantic을 `props`/`notes` fallback 없이도 읽을 수 있게 한다.
- `v0.1`의 안정적인 root/flow/interaction 인덱스 구조는 유지한다.
- exporter 기본값은 즉시 바꾸지 않고, `v0.2`는 병행 도입한다.

## Design Policy

- `screens[]`, `components[]`, `interactions[]`, `flows[]`, `assets[]`, `tokens`의 큰 뼈대는 유지한다.
- `v0.1` consumer가 이미 읽는 lookup key는 가능한 한 이름을 유지한다.
- `props.semantic`과 `notes.memo`는 제거 대상이 아니라 보조/원문 보존 레이어로 남긴다.
- `v0.2`에서는 codegen이 주요 semantic을 `props` fallback 없이도 읽을 수 있어야 한다.

## What Gets Promoted

### 1. Node Type Expansion

`v0.1`에서 generic `button`, `text`, `stack`으로 뭉개지던 타입을 승격한다.

- `listItem`
- `textField`
- `datePicker`
- `timePicker`
- `checkbox`
- `radio`
- `tab`
- `segmentedOption`
- `appBar`

원칙:

- widget 선택에 직접 영향을 주는 semantic subtype만 승격한다.
- visual shell type보다 control intent가 더 중요하면 semantic type을 우선한다.

### 2. onTap Action Expansion

`interaction.onTap.type`을 아래처럼 확장한다.

- `navigate`
- `openModal`
- `openComponent`
- `toggle`
- `select`
- `submit`
- `none`

추가 필드:

- `to`
- `targetId`

원칙:

- route 기반 target은 `to`
- id 기반 target은 `targetId`
- 둘 다 있으면 exporter는 둘 다 채워도 된다

### 3. Node State

selected/default/checked/active는 `notes.memo`만으로 두지 않고 정식 field로 둔다.

- `state.selected`
- `state.checked`
- `state.default`
- `state.active`

원칙:

- state는 visual decoration 해석 보조가 아니라 UI behavior 해석 입력이다.
- badge/check/accent signal과 semantic memo를 조합해 exporter가 채울 수 있다.

### 4. Node Semantic Snapshot

`props.semantic`은 남기되, 일부는 정식 `node.semantic`으로 승격한다.

- `semantic.type`
- `semantic.label`
- `semantic.notes`
- `semantic.componentRefId`
- `semantic.tokenRefs`
- `semantic.assetRefs`

원칙:

- `node.semantic`은 target-independent source snapshot
- `props`는 rendering/codegen helper
- 둘이 충돌하면 정식 `node.semantic` 우선

## What Stays The Same

- root screen/component 분리
- root `id`, `name`, `route`
- `flows[]` shape
- `interactionRefs[]` index 개념
- `notes.sourceMetaNodeId`, `flowId`, `flowStart`
- `tokens`, `assets` top-level registry

## Why Keep `props.semantic` And `notes.memo`

`v0.2`에서도 둘은 남긴다.

이유:

- source semantic 원문 보존
- schema 미승격 정보의 임시 보관
- 디버깅과 diff 검토
- mixed-version consumer 호환

역할 분리:

- `node.type`, `interaction`, `state`, `node.semantic`:
  codegen이 직접 신뢰해야 하는 구조화 계약
- `props.semantic`, `notes.memo`:
  부가 설명, 원문 보존, fallback

## Export Strategy

도입 순서:

1. exporter는 `v0.1` 기본 유지
2. 옵션 또는 별도 endpoint로 `v0.2` 병행 출력
3. semantic-rich sample로 `v0.1`/`v0.2` parity 비교
4. codegen이 `v0.2` 정식 지원
5. 그 다음에만 기본 전환 검토

## Migration Principles

- `v0.1`에서 되던 `navigate`, `openModal`, `row|column`, component reference는 `v0.2`에서도 그대로 읽혀야 한다.
- `v0.1`에서 `button`으로 처리하던 interactive control은 `v0.2`에서 더 구체적 타입으로 승격되더라도 클릭 가능 affordance가 사라지면 안 된다.
- `v0.1` consumer를 당장 깨지 않도록 exporter 기본값은 유지한다.

## Immediate Scope For First v0.2 Prototype

첫 `v0.2` prototype은 아래만 우선 목표로 한다.

1. `radio`, `checkbox`, `datePicker`, `textField`, `listItem` node type 승격
2. `toggle`, `openComponent`, `submit`, `select` onTap type 승격
3. `state.selected`, `state.checked`, `state.default`, `state.active` 도입
4. `node.semantic` 도입
5. `props.semantic` 병행 유지

## Out Of Scope

- exporter 기본 출력 즉시 전환
- `v0.1` 제거
- Flutter codegen 전체 전환
- Android/iOS target 동시 설계
