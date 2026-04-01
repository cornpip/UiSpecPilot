# CODEGEN_BASELINE

여러 입력 포맷을 서로 다른 타깃 프로젝트 구현으로 내리는 codegen 작업의 공통 실행 기준이다.

## Goal

- `codegen/` 아래 공통 agent 기준을 고정한다.
- 입력 해석 규칙과 출력 프로젝트 규칙의 우선순위를 분리한다.
- 타깃별 codegen 가이드는 이 baseline 위에서만 세부 규칙을 추가한다.

## Scope

- 현재 저장소의 spec / IR / compiler 결과물을 입력으로 읽는다.
- 다른 저장소 또는 별도 타깃 프로젝트 경로에 실제 산출물을 생성/수정한다.
- 언어별 가이드(`codegen/flutter/guide/` 등)는 이 공통 baseline 위에서 동작한다.

## Cross-Repo Target Rule

사용자가 별도의 `target project path`를 지정했거나, 현재 저장소 밖의 다른 프로젝트에 코드를 생성/수정하는 codegen 작업에서는 입력 해석 규칙과 출력 프로젝트 규칙을 분리해서 적용한다.

- 입력 해석은 현재 저장소의 해당 codegen baseline과 타깃별 guide를 따른다.
- 실제 구현, 명령 실행, 코드 생성, 포맷, 검증, generated file 처리 방식은 타깃 프로젝트에서 현재 에이전트가 기본적으로 참고해야 하는 로컬 작업 규칙 파일을 먼저 확인하고 따른다.
- 예: Codex는 보통 `AGENTS.md`, Claude는 보통 `CLAUDE.md`.
- 해당 로컬 규칙 파일이 다른 공통 규칙 파일을 참조하면 그 참조도 함께 따른다.

## Priority

- IR/spec 해석, mapping, generation mode 판단은 현재 저장소의 해당 codegen baseline과 타깃별 guide가 우선한다.
- 파일 배치, 라우팅/상태관리 적응, 명령 실행 방식, codegen 허용 범위, generated file 처리, formatter/analyzer/test 실행 방식은 타깃 프로젝트 로컬 규칙이 우선한다.
- 둘이 충돌하면 `입력 해석은 현재 codegen guide`, `실행/출력 절차는 타깃 프로젝트 규칙` 원칙으로 나눈다.

## Required Checks Before Editing

- 타깃 프로젝트 루트에서 현재 에이전트 기준의 엔트리 로컬 규칙 파일이 있는지 먼저 확인한다.
- 있으면 그 파일과 그 파일이 참조하는 공통 규칙을 먼저 읽는다.
- 현재 저장소 규칙만 읽고 타깃 프로젝트 규칙 확인 없이 cross-repo codegen 작업을 진행하지 않는다.

## Prompt Sync Rule

- `codegen/` 하위 baseline, guide 구조, cross-repo 실행 원칙, 타깃 출력 규칙이 바뀌면 영향을 받는 codegen 프롬프트도 같은 작업에서 함께 점검한다.
- 공통 규칙은 `codegen/CODEGEN_BASELINE.md`, 타깃별 규칙은 각 타깃 엔트리 README와 guide, 해당 실행 프롬프트가 같은 책임 경계를 유지하도록 관리한다.
