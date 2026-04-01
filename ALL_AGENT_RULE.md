# ALL_AGENT_RULE.md

## Monorepo Overview
- This repository (`UiSpecPilot`) is being reorganized around source specs, Figma projection, target compilers, and codegen guides.
- `codegen/`: Cross-repo code generation common rules and target-specific guides.
- `ui_spec/`: Common `ui_spec` source-of-truth assets and authoring guides.
- `figma/`: Figma plugin and bridge server for rendering/editing `ui_spec`.
- `compilers/flutter_ir/`: Flutter IR schema/examples for the first target compiler path.
- `codegen/flutter/`: Flutter code generation boundary and guides.

## Response Rules

- 사용자가 커밋 메시지 추천을 요청하면, 기본적으로 아래 형식으로 답한다.
- 첫 줄에는 헤드라인 커밋 메시지 1개만 제시한다.
- 그 아래에는 불릿 리스트로 상세 내용을 충분히 적는다.
- 상세 불릿은 변경 파일, 이유, 영향 범위를 이해할 수 있을 정도로 구체적으로 작성한다.

---

## ui_spec 작업 규칙

`ui_spec/samples/*.json` 생성/수정 작업을 수행할 때는 먼저 `ui_spec/guides/01-schema-rules.md`를 읽고, 그 문서가 안내하는 authoring 흐름과 관련 가이드를 따른다.

### Required Guides

- `ui_spec/guides/01-schema-rules.md`
- `ui_spec/guides/02-workflow.md`
- `ui_spec/guides/03-quality-checklist.md`
- `ui_spec/guides/04-prompt-templates.md`
- `ui_spec/guides/05-ui-structure-guidelines.md`
- `ui_spec/guides/06-settings-screen-patterns.md`
- `ui_spec/guides/07-app-bar-enddrawer-patterns.md`
- `ui_spec/guides/08-semantic-quality-gate.md`
- `ui_spec/guides/09-semantic-to-ir-check.md`

### Working Rules

1. 지원 타입/스키마 규칙을 위반하는 JSON을 생성하지 않는다.
2. 파일 경로는 `ui_spec/samples/` 하위만 대상으로 한다.
3. 새 `ui_spec` 파일 생성 시에는 `02-workflow.md`의 `YYYYMMDD_HHMMSS_<slug>.json` 네이밍 규칙을 기본으로 따른다.
4. 변경 후에는 가이드의 체크리스트 기준으로 자체 점검한다.
5. 가이드와 충돌하는 임의 규칙을 새로 만들지 않는다.
6. 사용자가 명시하지 않은 한 기존 `ui_spec/samples/*.json`의 화면 레이아웃이나 시각 구성을 새 작업의 레퍼런스로 삼지 않는다.
7. 기존 `ui_spec/samples/*.json`은 지원 필드, 스키마 형식, 렌더 안정성 확인용으로만 참고한다.
8. 사용자가 특정 기존 파일을 직접 지목해 "`이 파일처럼`"이라고 요청한 경우에만 그 파일의 레이아웃을 참고할 수 있다.
9. `ui_spec/guides/`의 authoring, semantic, export 규칙을 수정한 경우에는 관련 task 프롬프트가 최신 가이드와 일치하는지 같은 작업에서 함께 점검한다.
10. 최소 점검 대상은 변경 영향에 따라 `prompts/create-spec.md`, `prompts/edit-spec.md`, `prompts/semantic-review.md`를 포함한다.
11. 특히 `ui_spec -> intermediate IR` 해석 경계가 바뀐 경우에는 영향을 받는 codegen 프롬프트까지 함께 점검한다.
12. 프롬프트에는 가이드의 전체 설명을 그대로 복제하지 말고, 실제 작업 실패를 막는 핵심 실행 규칙만 반영한다.

---

## Codegen 작업 규칙

codegen 작업을 수행할 때는 먼저 공통 baseline과 해당 타깃 언어/플랫폼 엔트리 문서를 확인하고 따른다.

### Required Guides

- `codegen/CODEGEN_BASELINE.md`
- 해당 작업의 타깃별 엔트리 README

예:
- Flutter codegen 작업이면 `codegen/flutter/README.md`

### Working Rules

1. 공통 codegen 원칙과 cross-repo 작업 규칙은 `codegen/CODEGEN_BASELINE.md`를 따른다.
2. 세부 해석/출력 규칙은 해당 타깃 엔트리와 guide가 공통 규칙 위에 추가로 정의한다.
3. 전역 규칙 파일에는 codegen 엔트리 규칙만 두고, 언어별 세부 절차나 공통 prompt-sync 상세는 `codegen/` 하위 가이드에서 관리한다.
