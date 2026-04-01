# flutter codegen guide

`flutter_ir.json -> Flutter 코드` 생성을 위한 Flutter-specific 세부 guide 폴더다.

사람용 엔트리 문서는 상위 [`../README.md`](../README.md) 이고,
공통 agent baseline은 [`../../CODEGEN_BASELINE.md`](../../CODEGEN_BASELINE.md) 를 먼저 따른다.
이 폴더는 그 공통 규칙 위에서 Flutter 전용 해석/출력 규칙만 추가로 정의한다.

## MVP Scope
- 프롬프트 템플릿 작성 (`PROMPT_TEMPLATE.md`)
- baseline 분리 (`FLUTTER_APP_BASELINE.md`, `IR_CODEGEN_BASELINE.md`)
- 생성 규칙 정의 (`GUIDE.md`)
- 결과 검증 체크리스트 정의 (`CHECKLIST.md`)
- 샘플 입출력 기준 정리

## Current Contents
- `FLUTTER_APP_BASELINE.md`: 기존 프로젝트 우선 원칙과 공통 앱 기본 가이드
- `IR_CODEGEN_BASELINE.md`: `flutter_ir` 해석 우선순위와 codegen baseline
- `GUIDE.md`: IR 해석 순서, root closure 규칙, Flutter 매핑 기준
- `PROMPT_TEMPLATE.md`: LLM에 바로 넣을 수 있는 코드 생성 프롬프트
- `USER_REQUEST_TEMPLATE.md`: 사용자가 값만 채워 넣는 요청 형식
- `CHECKLIST.md`: 생성 결과 검증 항목
