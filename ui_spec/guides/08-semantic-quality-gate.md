# 08. Semantic Quality Gate

이 문서는 생성되었거나 수정된 `ui_spec`에 대해
source spec 관점에서 어떤 semantic을 점검하고,
부족한 semantic을 어떻게 보강할지 정의한다.

이 문서는 현재 `ui_spec` source contract 중 "semantic 최소 계약과 self-review 기준"을 담당한다.
즉 source-of-truth로서 필요한 semantic이 무엇인지와, 무엇이 아직 부족한지를 이 문서 기준으로 판단한다.

## Goal

- `semantic`을 선택적 주석이 아니라 source spec 계약으로 다룬다.
- visual JSON은 유지하면서 source spec 해석에 필요한 intent만 최소한으로 보강한다.
- 생성 프롬프트와 수정 프롬프트 모두 같은 self-review 절차를 따르게 한다.
- `ui_spec`를 target-specific fallback memo 저장소로 만들지 않고, 사람이 읽을 수 있는 최소 semantic contract를 유지한다.

## When To Run

다음 경우에는 항상 semantic 점검을 수행한다.

- 새 `ui_spec` 파일 생성 직후
- 기존 `ui_spec` 수정으로 화면 구조, 역할, interaction intent가 달라졌을 때
- export/codegen 전 source semantic 점검이 다시 필요할 때
- root `semantic`은 있으나 node-level semantic이 거의 비어 있는 상태일 때

## Quality Gate Levels

### Level 1. Root Semantic Readiness

root가 실제 screen 또는 reusable component라면 아래는 최소 충족이어야 한다.

- `semantic.id` 존재
- `semantic.role`이 `screen` 또는 `component`
- `role=screen`이면 `route` 존재
- `role=component`이면 `component.name` 존재

이 단계가 비면 source spec entrypoint 자체가 불안정해진다.

주의:

- target export 대상으로 쓰일 `ui_spec`의 최상위 root는 가능하면 이 Level 1 조건을 직접 만족해야 한다.
- 상태 비교용 `SECTION` 아래에 여러 `screen` frame variant를 넣는 방식은 authoring 메모로는 가능해도, active file export entrypoint로는 부적합하다.
- 상태 차이가 작으면 대표 visual root 1개에 현재 상태와 interaction intent만 남기고, 상태 차이가 커서 실제 화면 구성이 달라지면 별도 `ui_spec` 파일로 분리하는 편이 안정적이다.

### Level 2. Navigation / Reference Readiness

아래 node는 semantic이 거의 필수다.

- 탭 가능한 CTA, list row, app bar action
- 다른 screen으로 이동하는 affordance
- 다른 component를 여는 trigger
- list, pageView, image, icon처럼 widget 선택에 직접 영향을 주는 node

권장 최소 필드:

- `semantic.id`
- `semantic.type`
- 필요 시 `semantic.interaction.onTap`
- 필요 시 `semantic.navigation.mode`
- 필요 시 `semantic.componentRef.id`
- 필요 시 짧은 `semantic.label` 또는 unresolved 설명용 `semantic.notes`

강화 규칙:

- 실제 동작이 있는 interactive node는 `semantic.type`만으로 통과시키지 않는다.
- screen 이동, submit, toggle, select, component open처럼 구조화 가능한 intent가 있으면 최소한 `semantic.interaction.onTap.type`까지 명시한다.
- `semantic.label`과 `semantic.notes`는 구조화 semantic의 보조 설명이며, `interaction`, `navigation`, `reference`를 대체하지 않는다.
- `semantic.label`은 짧은 식별 문구로 제한하고, `semantic.notes`는 unresolved 사유나 검수 메모 수준으로 제한한다.
- `semantic.label`과 `semantic.notes`에 `선택`, `기본`, `selected`, `default`, `active` 같은 상태 단어를 쓸 때는 실제 현재 상태나 기본값을 뜻할 때만 사용한다.
- 단순 affordance 설명이라면 `남성 선택 버튼`, `생년월일 선택 입력`, `멤버 선택 화면`처럼 상태 추론 여지가 있는 표현보다 `남성 옵션`, `생년월일 입력 필드`, `프로필 지정 화면` 같은 중립 표현을 우선한다.
- `navigate`는 `to`, `open_component`는 `targetId`처럼 추적 가능한 대상 값을 함께 남긴다.
- 실제 interactive node지만 target route, submit contract, component target이 아직 설계되지 않았다면 값을 지어내지 않는다.
- 이 경우에도 `semantic.id`, `semantic.type`, 필요 시 `semantic.label`까지는 남기고, 왜 structured `onTap`을 비웠는지 `notes`로 명시하는 것을 권장한다.
- 즉 "unknown action"은 무semantic 처리하지 말고, "interactive but target unresolved" 상태로 드러내야 한다.

### Level 3. Source-level Disambiguation

visual 정보만으로 source 의미 해석이 흔들리는 node는 semantic으로 보강한다.

- absolute positioned frame이지만 실제 의도는 `row` 또는 `column`
- 텍스트+아이콘 묶음이 실제로 button
- 반복 카드 목록이 실제로 list
- 스와이프 가능한 strip이 pageView/carousel
- 단순 장식 이미지와 의미 있는 콘텐츠 이미지 구분 필요
- 일반 입력처럼 보이지만 실제 의도는 date/time picker trigger
- 버튼처럼 보이지만 실제 의도는 checkbox/radio/tab/segmented selector
- 한 row 안에 local toggle과 detail navigation affordance가 함께 있는 복합 action node
- list row처럼 보이지만 실제 주목적이 detail navigation이 아니라 selection인 카드/행
- `textField` 내부 trailing icon/button처럼 부모 입력과 별도 tap intent를 가진 보조 액션

## Semantic Audit Questions

self-review 시 아래 질문을 순서대로 본다.

1. 이 root는 screen인가 component인가?
2. screen이라면 route는 있는가, 그리고 flow는 실제 multi-screen 흐름 관리가 필요할 때만 쓰고 있는가?
3. 사용자가 탭할 수 있는 node는 모두 식별 가능한 `semantic.id`가 있는가?
4. 탭 결과가 navigate인지, component open인지, local toggle인지 구분되어 있는가?
5. visual만 보면 `frame`으로 읽히지만 실제 의미는 row/column/button/list인 node가 있는가?
6. cross-file reference가 필요한 node에 `targetId`, `to`, `componentRef.id`가 충분한가?
7. 설명이 필요한 선택 상태, 기본값, 강조 상태가 있다면 `label` 또는 `notes`로 남아 있는가?
8. interactive node에 `semantic.type`만 있고 실제 `interaction.onTap`은 빠져 있지 않은가?
9. checkbox/radio/tab/picker trigger 같은 상태형 control이 generic `button` 또는 `textField`로 뭉개져 있지 않은가?
10. 하나의 row 안에 둘 이상의 affordance가 섞여 있다면 action을 분리했거나 최소한 primary action이 구조화되어 있는가?
11. `semantic.id`가 문서 전체에서 유일한가?
12. 반복 카드/옵션/행이 여러 개 있을 때 visually similar sibling끼리 같은 `semantic.id`를 재사용하고 있지 않은가?
13. `notes`가 구조화 가능한 intent를 대신하고 있지 않은가?
14. interactive node인데 target 미정이라 `onTap`을 비웠다면, 그 사유가 `notes`로 남아 있는가?
15. 필터 칩, segmented selector, tab처럼 상호배타 선택 UI가 generic `button`으로만 남아 있지 않은가?
16. 선택용 카드/list row가 detail navigation row와 같은 방식으로 뭉개져 있지 않은가?
17. 상단 요약 카드와 하단 선택 옵션이 함께 있을 때, 요약 카드가 현재 선택값을 반영하는 슬롯인지 단순 고정 카드인지 semantic/state로 구분되어 있는가?
18. 검색창 내부 trailing action 같은 보조 affordance가 부모 `textField` semantic에 흡수되지 않았는가?
19. root/node `label` 또는 `notes`가 현재 파일에 없는 다른 상태(default/selected before/after)를 함께 설명하고 있지 않은가?
20. title, placeholder, CTA, badge 같은 visible text가 실제 상태가 아닌데도 `selected/default`처럼 상태로 읽힐 표현을 포함하고 있지 않은가?

## Authoring Policy

원칙:

- semantic은 "모든 node에 무조건 붙이기"가 아니다.
- purely visual node는 semantic 없이 둬도 된다.
- 그러나 source 의미 해석이 갈릴 가능성이 있는 node는 semantic을 아끼지 않는다.
- semantic은 visual을 복제하지 않고 intent만 적는다.
- target schema의 한계를 메우기 위한 fallback tag를 source에 미리 과하게 적지 않는다.
- 단, 반복적으로 필요한 variant별 visual diff는 prose fallback이나 raw trace 메타 대신 `componentVariants` 같은 정식 필드로 다루는 편이 낫다.

권장 우선순위:

1. root semantic
2. tappable node semantic
3. navigation/component reference
4. layout-disambiguating type (`row`, `column`, `button`, `list`, `pageView`)
5. optional label/notes

추가 원칙:

- `semantic.type=button`만으로는 submit/select/toggle/open/navigation intent를 충분히 표현한 것으로 보지 않는다.
- 상태형 control은 가능하면 generic button보다 더 구체적인 type 또는 interaction으로 intent를 좁힌다.
- 선택 UI는 현재 선택 상태, 기본값, 상호배타 관계가 실제 해석에 꼭 필요할 때만 `notes` 또는 구조화 field로 남긴다.
- 선택 UI의 핵심 관계가 현재 스키마의 `semantic` / `state` / structured interaction으로 표현 가능하면 그것을 우선 사용한다.
- 다만 동일 shell의 variant별 visual/action 차이가 downstream 구현 정확도에 직접 필요하면, raw variant 메타나 notes에 맡기지 말고 `componentVariants` 정식 필드 사용을 검토한다.
- 상태형 control이나 선택 UI라도 `label`/`notes`가 "선택 가능한 옵션" 설명인지 "이미 선택된 상태" 설명인지 구분해서 적는다.
- 실제 현재 상태가 아닌 경우 `선택`, `기본`, `selected`, `default` 같은 상태 단어를 관성적으로 쓰지 않는다.
- 같은 원칙을 visible text에도 적용한다. placeholder, CTA, 타이틀 문구가 상태를 설명하지 않을 때는 `선택`보다 `입력`, `지정`, `시작`, `사용` 같은 중립 동사를 우선 검토한다.
- 복합 affordance row는 하나의 semantic으로 단순화해도 되는지 먼저 검토하고, 안 되면 하위 node 분리를 우선한다.
- 필터 칩이 상호배타 선택이면 우선 `radio` 계열 intent로 해석하고, 단순 CTA 버튼처럼 기록하지 않는다.
- 카드/row의 주행동이 selection이면 `listItem + onTap.toggle` 같은 구조를 우선 검토하고, detail navigation row와 같은 semantic으로 처리하지 않는다.
- 검색창, picker field, selection field 내부에 trailing icon/button이 따로 tappable하면 부모 field와 별도 semantic node로 분리한다.
- target 미정 상태는 허용되지만, `navigate`/`open_component`/submit 값을 추측해서 채우는 것보다 unresolved 상태를 명시적으로 남기는 편이 낫다.
- node-level `tokenRefs`, `assetRefs`, memo tag 같은 compiler enrichment 정보는 semantic pass 기준으로 요구하지 않는다.

## Patch Strategy

semantic 보강은 아래 원칙으로 수행한다.

- 기존 visual field는 유지
- 필요한 node에만 `semantic` 추가
- optional field는 비어 있으면 저장하지 않음
- route, targetId, componentRef.id는 실제 참조 가능한 값만 기록
- root/node `semantic.id`는 문서 내 유일하게 유지
- visually similar 반복 옵션/card라도 각 semantic-bearing node는 실제 엔티티 기준으로 서로 다른 `semantic.id`를 유지한다.
- 구조화 가능한 intent는 `notes`만 추가해서 끝내지 않음
- 실제 trigger node가 있으면 그 node에 interaction을 붙이고, 설명 텍스트나 장식 node에는 semantic을 남발하지 않음
- 하나의 semantic node에 서로 다른 action intent를 억지로 합치지 않음
- interactive node인데 target이 미정이면 `onTap`을 비워 둘 수 있으나, 이때는 fallback inference 의존 사실을 `notes`에 적는다.
- 검색창 내부 trailing action, 복합 row의 dismiss/toggle, 카드 우측 chevron처럼 실제 trigger가 분리된 경우 trigger node에 semantic을 우선 부여한다.
- 특정 compiler 내부 보존을 위한 tag-like memo를 source에서 먼저 채워 넣는 방식은 지양한다.
- root `notes`에는 현재 파일이 직접 표현하는 상태만 적고, 다른 상태와의 before/after 비교나 상태 전이 설명은 넣지 않는다.

## Pattern-specific Guidance

### Header / App Bar Cluster

- 상단에 leading(back/menu), title 영역, trailing action이 함께 있고 그 주역할이 현재 위치 표시, 화면 이탈/복귀, 보조 action 제공이라면 개별 action node semantic만 두지 말고 상위 header cluster semantic도 함께 검토한다.
- 이 경우 상위 cluster는 가능하면 `app bar` 성격이 드러나도록 표현하고, 하위 leading/trailing action은 개별 semantic을 유지한다.
- 단, 상단 영역이 hero, intro, summary, decorative band처럼 본문 콘텐츠의 일부로 읽히면 `app bar`로 단정하지 않는다.
- 즉 상단에 버튼이 있다는 이유만으로 `app bar`로 승격하지 말고, 해당 영역의 1차 역할이 navigation shell인지 content header인지 먼저 판단한다.

### Unknown Action / Fallback-required Trigger

- 뒤로가기, 시작 CTA, 외부 링크 버튼처럼 interactive node가 분명하지만 target 설계가 아직 없을 수 있다.
- 이 경우 `semantic.id`, `semantic.type`, 필요 시 짧은 `semantic.label`은 남기고, 확인 가능한 route/targetId/componentRef.id가 생기기 전까지는 구조화 target을 추측해서 넣지 않는다.
- 권장 `notes` 예시: `target route 미정으로 structured onTap 생략`, `submit contract 미정으로 fallback inference 필요`

### Exclusive Filter Chips / Segmented Selection

- `전체`, `최근`, `오늘`처럼 1-of-N 선택이면 generic `button`보다 `radio`, `tab`, `segmented selector`에 가까운 intent인지 먼저 본다.
- 현재 schema에 별도 grouped selector field가 없더라도, 최소한 각 chip의 `semantic.type`과 `interaction.onTap.type`으로 selection intent를 남긴다.
- 그룹 node 설명이 꼭 필요하면 상호배타 선택 그룹이라는 `label` 또는 `notes`를 짧게 남긴다.

### Selectable Card / List Row

- card나 row가 시각적으로 list row여도 실제 행동이 "상세 보기"가 아니라 "선택 상태 변경"일 수 있다.
- 이 경우 `listItem`만으로 끝내지 말고 selection intent를 함께 남긴다.
- 선택 상태, 기본 선택, 현재 강조 상태는 실제 해석에 필요할 때만 `label` 또는 `notes`로 보조 보존한다.
- `현재 선택된 카드`처럼 실제 상태를 뜻하지 않는 한 `label`에 상태 단어를 넣지 않는다. 단순 affordance 설명이면 `프로필 카드`, `상단 요약 카드`, `멤버 옵션 카드` 같은 중립 표현을 우선한다.
- 상단 summary/hero card가 하단 옵션 선택 결과를 반영하는 자리라면, 그 관계를 raw variant 메타나 prose 설명에만 맡기지 말고 현재 선택 슬롯이라는 semantic/state 의도를 함께 남긴다.
- 이때 current-selection slot 관계 자체는 `semantic/state`에 남기고, guest/member처럼 variant별 visual 차이가 실제 구현에 필요하면 그 차이는 `componentVariants`로 구조화한다.
- 반대로 summary card가 고정 안내 카드라면 선택 옵션과의 상태 연동을 암시하는 표현을 피한다.

### Variant Visual Source-of-Truth

- `meta.instanceOf.availableVariants`는 trace/inspection용이지 visual source-of-truth가 아니다.
- variant 존재 사실과 설명만으로는 downstream이 stroke/fill/effect/trailing action 차이를 확정할 수 없으므로, 그 차이가 실제 구현에 중요하면 `componentVariants`를 사용한다.
- `componentVariants`가 있으면 reviewer는 최소한 다음을 점검한다.
- `currentVariant`가 현재 대표 visual state와 일치하는가?
- 각 variant entry가 실제로 달라지는 `surface`, `badge`, `text`, `trailingAction`만 담고 있는가?
- `semantic/state`에 이미 있는 의미를 purely visual diff 안에만 숨기고 있지는 않은가?

### Text Field With Trailing Action

- 검색창, 날짜 선택 필드, 코드 입력 필드 안에 trailing mic/icon/clear button이 있으면 부모 field와 다른 affordance일 수 있다.
- 부모는 `textField`나 picker trigger semantic을 유지하고, trailing action은 별도 `semantic.id`와 interaction을 갖는 child node로 분리한다.
- trailing action이 modal open, voice input, clear, scanner launch처럼 구체화 가능하면 `onTap.type`을 child node에 직접 기록한다.
- field label은 `생년월일 선택`, `날짜 선택 입력`처럼 상태로 읽힐 수 있는 표현보다 `생년월일 입력 필드`, `날짜 피커 필드`, `날짜 열기 버튼` 같은 표현을 우선한다.

## Prompt Workflow

프롬프트 기반 작업에서는 아래 순서를 권장한다.

1. visual 구조 작성 또는 수정
2. semantic audit 수행
3. 누락/모호한 node 목록 작성
4. 해당 node에만 semantic patch 적용
5. 최종 JSON 저장
6. quality checklist + semantic gate 재검토

## Recommended Output Format In Agent Reasoning

에이전트가 내부적으로 정리할 최소 표 형태:

| node | current issue | semantic patch |
| --- | --- | --- |
| `root` | screen인데 route 없음 | `semantic.route` 추가 |
| `cta_settings` | 탭 가능하지만 의미 불명 | `type=button`, `onTap.navigate` 추가 |
| `filter_row` | absolute frame이라 row intent 유실 가능 | `type=row` 추가 |

최종 사용자 응답에는 이 표를 그대로 노출할 필요는 없지만,
최소한 어떤 semantic을 왜 추가했는지는 짧게 요약한다.

## Prompt Rules

프롬프트에는 아래 문장을 명시하는 것을 권장한다.

- 초안 작성 후 반드시 semantic self-review를 수행할 것
- visual-only 해석으로 source 의미가 흔들릴 수 있는 node를 찾아 semantic patch를 적용할 것
- root semantic readiness, navigation/reference readiness, source-level disambiguation을 순서대로 점검할 것
- 불필요한 semantic 남발은 피하되, source contract에 중요한 semantic은 생략하지 말 것

## Minimum Pass Criteria

최소 통과 기준:

- root semantic readiness 통과
- semantic 의미가 있는 root/node의 `semantic.id`가 문서 내에서 유일함
- 반복 옵션/card의 `semantic.id`가 실제 엔티티 단위로 구분되어 IR node id 충돌을 만들지 않음
- 모든 주요 interactive node에 stable semantic id 존재
- 실제 동작이 있는 주요 interactive node에 `semantic.interaction.onTap.type` 또는 동등한 구조화 semantic이 존재
- 주요 navigation/component reference가 path 또는 target id 기준으로 추적 가능
- row/column/button/list/pageView 오해 가능성이 큰 node에 semantic type 보강 완료
- checkbox/radio/tab/date picker trigger 같은 상태형/선택형 control이 generic `button` 또는 `textField`로 방치되지 않음
- 선택 요약 카드와 선택 옵션이 함께 있으면 요약 영역이 current-selection slot인지 고정 장식 카드인지 semantic/state로 구분됨
- `notes`만으로 submit/select/toggle/navigation intent를 설명하고 구조화 field를 비워 두지 않음
- 복합 action row는 primary action이 구조화되어 있고, 필요 시 하위 affordance 분리 여부가 검토됨
- semantic pass의 핵심은 source semantic quality이며, compiler fallback memo나 enrichment field를 source에 미리 많이 적는 것이 아님
- 다만 target route나 submit contract 자체가 미정인 interactive node는 예외적으로 unresolved 상태를 허용할 수 있으며, 이 경우 semantic unresolved 상태가 `notes` 또는 검수 결과에 명시되어야 함

위 기준을 못 맞추면 visual JSON이 렌더되더라도
semantic source 품질은 낮다고 판단한다.
