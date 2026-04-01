# 05. Semantic To IR Check

이 05번 가이드는 source semantic 품질과 IR 정규화 가능성의 경계를 구분하고, semantic-to-IR 점검 기준을 정의한다.
즉 semantic 자체를 새로 정의하지 않고, 이미 작성된 source semantic이 downstream 변환 입력으로 충분한지만 판단한다.

semantic 자체의 품질 기준은 `04-semantic-quality-gate.md`를 따른다.
semantic-to-IR check의 공통 기준 문서는 `compilers/UI_SPEC_TO_IR_BASELINE.md`다.

## Goal

- source semantic review와 semantic-to-IR check의 책임을 분리한다.
- source semantic이 공통 IR baseline으로 무리 없이 정규화될 수 있는지 점검한다.
- compatibility 문제를 이유로 source에 target-specific fallback memo를 과적재하지 않는다.

## Scope

이 문서는 특정 target IR schema를 직접 검사하는 문서가 아니다.
대신 `compilers/UI_SPEC_TO_IR_BASELINE.md`에 정의된 공통 IR baseline 기준으로,
현재 source semantic이 IR 변환 입력으로 충분한지 점검한다.

개별 target IR의 schema 제약이나 전용 매핑은 각 compiler guide가 별도로 다룬다.

## When To Run

- semantic source review가 끝난 뒤
- active file export 전
- compiler/export 결과가 기대와 다를 때
- `compilers/UI_SPEC_TO_IR_BASELINE.md` 기준으로 IR 정규화 가능성이 흔들릴 때

## Core Rules

- semantic source 품질과 semantic-to-IR check를 같은 책임으로 섞지 않는다.
- semantic은 특정 compiler에 종속되지 않는다.
- IR 변환 ambiguity가 발견되어도, 그것만을 이유로 source에 target-specific fallback memo를 과적재하지 않는다.
- 다만 `compilers/UI_SPEC_TO_IR_BASELINE.md` 기준으로 stable하게 정규화하려면 꼭 필요한 최소 semantic 보강은 source semantic contract를 해치지 않는 범위에서만 허용한다.
- IR 정규화 한계는 source semantic 불충분과 구분해서 보고한다.

## Check Questions

1. `compilers/UI_SPEC_TO_IR_BASELINE.md` 기준으로 root가 screen/component entrypoint로 안정적으로 정규화 가능한가?
2. interaction, navigation, component reference 같은 구조화 semantic이 공통 IR baseline으로 손실 없이 정규화 가능한가?
3. row/column/button/list/pageView/date picker trigger 같은 공통 UI intent가 target-independent 방식으로 구분 가능한가?
4. 반복 옵션/card의 `semantic.id`, `state`, selection 관계가 IR 정규화 과정에서 충돌 없이 유지 가능한가?
5. visible text가 실제 상태가 아닌데도 IR 정규화 단계에 selected/default 같은 상태 힌트를 과하게 줄 여지가 없는가?
6. unresolved route/submit contract 같은 예외가 있으면, source semantic 문제인지 아니면 target-specific consumer 문제인지 구분되어 보고되는가?

## Reporting Rules

- semantic source review 결과와 semantic-to-IR check 결과를 분리해서 보고한다.
- semantic source는 충분하지만 IR 정규화 단계에서만 한계가 남아 있으면, semantic 불충분으로 오판하지 않는다.
- 반대로 IR 정규화가 통과하더라도 source semantic이 빈약하면 semantic review 통과로 과장하지 않는다.
- IR 정규화가 fallback inference에 의존하면 그 사실을 명시적으로 보고한다.

## Issue Classification Examples

| case | classify as | reason |
| --- | --- | --- |
| tappable node에 `semantic.id`가 없음 | semantic issue | source에서 stable reference가 없음 |
| `semantic.type`만 있고 `interaction.onTap.type`이 없음 | semantic issue | 구조화 가능한 trigger intent가 source에 없음 |
| screen root인데 `semantic.route`가 없음 | semantic issue | screen entrypoint 의미가 source에서 불충분 |
| selection card와 detail row가 모두 generic `button`으로만 기록됨 | semantic issue | source-level disambiguation 부족 |
| source semantic은 충분하지만 target compiler가 특정 subtype을 아직 좁게만 매핑함 | IR normalization issue | source보다 downstream 해석 제약 문제 |
| `navigate.to`와 `navigation.mode`는 있으나 target IR exporter가 특정 mode를 누락함 | IR normalization issue | source는 충분하고 exporter가 손실을 냄 |
| route/submit contract 자체가 아직 제품 설계상 미정이고 source가 이를 `notes`로 명시함 | unresolved source dependency | semantic이 비어 있는 것이 아니라 upstream product decision이 미정 |
| visible text 때문에 exporter가 `selected/default`를 과추론함 | IR normalization issue 또는 exporter issue | source가 중립 표현을 썼는데도 정규화가 과추론하면 downstream 문제다 |
| visible text와 `label/notes` 자체가 상태처럼 읽히게 작성됨 | semantic issue | source 표현이 과추론을 유발함 |

## Prompt Guidance

create/edit 프롬프트에서 semantic-to-IR check를 요구할 때는 아래 원칙을 따른다.

- semantic source review를 먼저 수행하고 compatibility check는 후속 단계로 둔다.
- compatibility fix를 위해 source semantic을 손댈 때는 source contract 개선인지 target-specific workaround인지 구분해 설명한다.
- compatibility gap 보고 시 source semantic issue와 IR 정규화 limitation을 한 문장에 섞어 쓰지 않는다.
