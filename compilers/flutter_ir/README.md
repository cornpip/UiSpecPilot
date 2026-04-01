# flutter_ir

`ui_spec`를 Flutter 구현용 중간 포맷으로 변환하기 위한 compiler 경계입니다.

공통 compiler 규칙은 [`../UI_SPEC_TO_IR_BASELINE.md`](../UI_SPEC_TO_IR_BASELINE.md) 를 따릅니다.
target 폴더 구조 규격은 [`../TARGET_IR_DIRECTORY_STANDARD.md`](../TARGET_IR_DIRECTORY_STANDARD.md) 를 따릅니다.

현재 포함 항목:

- `schema/`: `flutter_ir` schema
- `exporter/`: 룰 베이스 `ui_spec -> flutter_ir` 변환 알고리즘 정의
- `examples/`: sample IR payload
- `out/`: generated export output
- `rollout/`: version diff, rollout, migration notes

문서 역할:

- source authoring 쪽은 공통 baseline과 `ui_spec/guides/`를 본다.
- target-specific exporter 규칙은 `exporter/` 아래에서 관리한다.
- Flutter codegen consumer 해석 규칙은 `codegen/flutter/guide/`에서 관리한다.

현재 rollout 기준의 기본 exporter 출력은 `flutter_ir v0.1` 유지입니다.
`v0.2` schema와 codegen 해석 규칙은 이미 병행 문서화되어 있지만, 기본 전환은 rollout 검증 후에만 진행합니다.
기본 export 단위는 entry screen 1개와 그 screen이 직접 참조하는 component closure입니다.
다른 screen으로의 navigation 정보는 `flows[]`와 `interactions[]`에 남기되, 대상 screen root 전체는 기본적으로 자동 포함하지 않습니다.
연결된 screen root까지 함께 담는 closure export는 opt-in 동작으로만 사용합니다.
codegen 가이드는 `v0.2` 우선 해석 규칙을 따르되, 현재 기본 export인 `v0.1` fallback도 계속 지원합니다.
