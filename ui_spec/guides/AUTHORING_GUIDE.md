# UI Spec Authoring Guide

이 폴더는 `ui_spec/samples/*.json`을 생성/수정하는 에이전트를 위한 운영 가이드입니다.

이 프로젝트에서 `ui_spec`의 source contract는 단일 spec 문서가 아니라 이 가이드 세트로 정의합니다.
특히 `01-schema-rules.md`, `08-semantic-quality-gate.md`, `09-semantic-to-ir-check.md`를 계약 기준 세트로 취급합니다.

## 목적

- 에이전트가 일관된 방식으로 `ui_spec`을 작성하도록 표준화
- 플러그인 렌더 실패를 줄이기 위한 최소 규칙 제공
- 실시간 sync 환경에서 안전하게 수정하는 절차 정의

## 빠른 시작

1. [01-schema-rules.md](./01-schema-rules.md) 확인
2. [02-workflow.md](./02-workflow.md) 순서대로 수행
3. [03-quality-checklist.md](./03-quality-checklist.md) 최종 점검
4. 필요 시 [04-prompt-templates.md](./04-prompt-templates.md) 템플릿 사용
5. 화면 역할과 공통 UI 해석이 필요하면 [05-ui-structure-guidelines.md](./05-ui-structure-guidelines.md) 참고
6. `settings` 화면 세부 패턴은 [06-settings-screen-patterns.md](./06-settings-screen-patterns.md) 참고
7. `app bar`와 `endDrawer` 패턴은 [07-app-bar-enddrawer-patterns.md](./07-app-bar-enddrawer-patterns.md) 참고
8. semantic source quality 점검은 [08-semantic-quality-gate.md](./08-semantic-quality-gate.md) 참고
9. semantic-to-IR check는 [09-semantic-to-ir-check.md](./09-semantic-to-ir-check.md) 참고

## 이 프로젝트의 핵심 규칙

- 대상 파일은 `ui_spec/samples/` 하위 `.json`만 사용
- 최상위 `type`은 지원 타입 중 하나여야 함
- `ui_spec`의 1차 목적은 사람이 읽고 수정하는 공통 semantic source spec 유지임
- semantic은 필요한 node에만 추가하고, target-specific fallback memo까지 source에 과적재하지 않음
- semantic review는 source spec 의미를 점검하는 단계이고, target compiler compatibility는 별도 검토 단계로 분리해 다룸
- target compiler export 대상 파일은 최상위 root가 실제 `screen` 또는 `component` 역할을 직접 가지도록 유지함
- 상태 비교용 variant를 export 대상 한 파일의 최상위 `SECTION` 아래 여러 `FRAME`로 묶지 않음
- `Set Active File` 이후에만 `Start Realtime Sync` 사용
- sync 중 변경은 기존 프레임 교체 방식으로 반영됨
- 사용자가 명시하지 않으면 기존 `ui_spec/samples/*.json`을 레이아웃 레퍼런스로 사용하지 않음
- 기존 `ui_spec/samples/*.json` 참고는 스키마/필드/안정성 확인 용도에 한정

## 지원 루트 타입

`FRAME`, `GROUP`, `SECTION`, `COMPONENT`, `RECTANGLE`, `TEXT`, `ELLIPSE`, `LINE`, `POLYGON`, `STAR`, `SVG`, `ICON`
