# flutter_ir v0.1 -> v0.2 Diff

이 문서는 `flutter_ir v0.1`과 `v0.2`의 주요 차이와
전환 시 어떤 consumer 영향이 생길 수 있는지 빠르게 보는 용도다.

## Summary

`v0.2`는 전체 구조를 바꾸는 버전이 아니다.
대신 `v0.1`에서 `props.semantic`과 `notes.memo`로 우회 보존하던 의미 중
codegen에 중요한 부분을 정식 필드로 승격한다.

## Added In v0.2

### Node `type` enum

`v0.1`:

- `frame`
- `text`
- `image`
- `icon`
- `row`
- `column`
- `stack`
- `container`
- `button`
- `list`
- `pageView`

`v0.2` adds:

- `listItem`
- `textField`
- `datePicker`
- `timePicker`
- `checkbox`
- `radio`
- `tab`
- `segmentedOption`
- `appBar`

### `interaction.onTap.type`

`v0.1`:

- `navigate`
- `openModal`
- `none`

`v0.2` adds:

- `openComponent`
- `toggle`
- `select`
- `submit`

### New node fields

`v0.2` adds:

- `node.state`
- `node.semantic`

## Promoted From Fallback

아래 정보는 `v0.1`에서는 보통 `props.semantic` 또는 `notes.memo`로 남았지만,
`v0.2`에서는 정식 field 후보가 된다.

- radio / checkbox / picker trigger 같은 control subtype
- toggle / openComponent / submit / select action type
- selected / checked / default / active state
- node-level semantic label / notes / componentRef / tokenRefs / assetRefs

## What Does Not Change

- top-level `screens[]`, `components[]`, `interactions[]`, `flows[]`, `tokens`, `assets`
- root `id`, `name`, `route`
- interaction index 방식
- `notes.sourceMetaNodeId`, `notes.flowId`, `notes.flowStart`

## Compatibility Risk

`v0.2` 설계 추가 자체는 안전하지만,
기본 export를 `v0.2`로 바꾸면 아래 consumer가 깨질 수 있다.

- `button`만 가정하는 codegen
- `navigate|openModal|none`만 읽는 interaction parser
- `v0.1` schema validation만 돌리는 툴
- `props.semantic` fallback에 의존하던 로직

## Safe Rollout

권장 순서:

1. `v0.2` schema와 설계 문서 추가
2. exporter는 `v0.1` 기본 유지
3. semantic-rich sample로 `v0.1`/`v0.2` 비교
4. codegen이 `v0.2`를 읽도록 보강
5. 그 다음 기본 전환 검토

## Recommendation

- 단기: `v0.1` fallback preservation 유지
- 중기: semantic-heavy screen은 `v0.2` 실험 출력으로 검증
- 장기: codegen parity 확보 후 기본 전환
