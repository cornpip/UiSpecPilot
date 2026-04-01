# flutter_ir exporter

이 폴더는 룰 베이스 `ui_spec -> flutter_ir` exporter 알고리즘 정의를 모아 둡니다.

## Scope

- field mapping
- semantic preservation
- fallback / warning policy
- schema version별 export 동작 차이의 구현 기준

## Non-Goals

- source `ui_spec` authoring 규칙 정의
- Flutter codegen consumer 해석 규칙 정의

source 작성 단계에서는 공통 baseline인 [`../../UI_SPEC_TO_IR_BASELINE.md`](../../UI_SPEC_TO_IR_BASELINE.md) 를 우선 보고,
이 폴더 문서는 exporter 구현과 유지보수 기준으로만 사용합니다.

현재 문서:

- [`MAPPING_RULES.md`](./MAPPING_RULES.md)
- [`SEMANTIC_PRESERVATION.md`](./SEMANTIC_PRESERVATION.md)
