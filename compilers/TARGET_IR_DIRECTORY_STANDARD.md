# Target IR Directory Standard

이 문서는 `compilers/<target_ir>/` 폴더가 공통적으로 따라야 하는 기본 구조를 정의한다.

## Goal

- target IR별 문서 역할을 폴더 구조에서 바로 읽히게 한다.
- source authoring 관점의 공통 baseline과 target-specific exporter 설계를 분리한다.
- 이후 `flutter_ir`, `android_ir`, `ios_ir` 같은 새 target이 들어와도 같은 구조를 재사용한다.

## Standard Layout

기본 구조:

- `compilers/<target_ir>/README.md`
- `compilers/<target_ir>/schema/`
- `compilers/<target_ir>/exporter/`
- `compilers/<target_ir>/examples/`
- `compilers/<target_ir>/out/`
- `compilers/<target_ir>/rollout/` (버전 전환 또는 migration 문서가 있을 때)

## Directory Roles

### `README.md`

- 해당 target IR의 개요 문서
- 공통 baseline 위에서 이 target이 무엇을 담당하는지 설명
- `schema`, `exporter`, `examples`, `rollout`의 역할을 요약
- source authoring 문서가 아니라 target compiler 경계 문서임을 명시

### `schema/`

- 최종 target IR payload shape 정의
- JSON schema, enum, required field, version contract 포함
- exporter 구현과 consumer 검증이 함께 참조
- target IR는 agent가 authoring하는 source spec이 아니라 compiler output contract이므로 명확한 schema가 있다.
- `v0.1`, `v0.2` 같은 버전 차이는 schema diff로 추적 가능해야 한다

### `exporter/`

- 룰 베이스 `ui_spec -> target_ir` 변환 알고리즘 정의
- field mapping, preservation, fallback, closure, warning 정책 포함
- agent authoring 지침이 아니라 compiler/exporter 구현 기준 문서

권장 파일 예:

- `exporter/README.md`
- `exporter/MAPPING_RULES.md`
- `exporter/SEMANTIC_PRESERVATION.md`

### `examples/`

- sample target IR payload
- schema와 exporter 결과 예시 검증용

### `out/`

- 실제 exporter 실행 산출물
- generated artifact 영역

### `rollout/`

- schema version diff
- migration
- default version 전환 계획
- mixed-version compatibility 정책

## Boundary Rule

- `ui_spec/` 문서는 공통 source semantic contract와 공통 IR baseline까지만 본다.
- target-specific exporter 알고리즘은 `compilers/<target_ir>/exporter/`에서 관리한다.
- target-specific consumer 해석 규칙은 가능하면 `codegen/<target>/` 아래에서 관리한다.

## Naming Guidance

- 역할이 드러나는 이름을 우선한다.
- `DESIGN`, `DRAFT` 같은 표현만으로는 역할이 흐려질 수 있으므로,
  가능하면 `MAPPING_RULES`, `SEMANTIC_PRESERVATION`, `V0_2_DESIGN`, `MIGRATION`처럼 책임이 드러나는 이름을 사용한다.
