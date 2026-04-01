# codegen

여러 입력 포맷을 서로 다른 타깃 프로젝트 구현으로 내리는 codegen 경계를 설명하는 사람용 개요 문서다.

agent가 따라야 하는 공통 실행 기준은 [`CODEGEN_BASELINE.md`](./CODEGEN_BASELINE.md) 에서 관리한다.

## Common Structure

- `README.md`: 사람용 개요
- `CODEGEN_BASELINE.md`: 공통 agent baseline
- `<target>/README.md`: 타깃별 사람용 엔트리
- `<target>/guide/`: 타깃별 세부 guide와 baseline

## Current Targets

- `flutter/`: Flutter codegen 경계
  - `README.md`: Flutter codegen 엔트리
  - `guide/`: Flutter-specific baselines, rules, templates

## Reading Rule

- 공통 실행 기준은 `CODEGEN_BASELINE.md`를 먼저 읽는다.
- 그 다음 타깃별 엔트리 README와 guide를 읽는다.
