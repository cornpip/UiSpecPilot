# 03. Quality Checklist

저장 전/후 체크리스트입니다.

## 저장 전

- JSON 파싱 성공
- 루트 `type` 유효
- root가 screen/component라면 `semantic.id`, `semantic.role` 존재
- export 대상 파일의 최상위 root가 직접 `screen` 또는 `component` semantic을 가지는지 확인
- 상태 비교용 variant를 최상위 `SECTION` 아래 여러 `FRAME`로 묶어 export source를 애매하게 만들지 않았는지 확인
- 주요 텍스트 오탈자 확인
- 색상/간격 일관성 확인
- `strokes`가 모두 `{ color: ... }` 객체 배열인지 확인. 문자열 stroke shorthand 금지
- shadow effect를 썼다면 `color`, `x`, `y`, `blur`, `spread` 키 기준으로 작성됐는지 확인
- `semantic.label` / `semantic.notes`에 `선택`, `기본`, `selected`, `default`, `active` 같은 상태 단어가 들어가면 실제 현재 상태를 뜻하는지 확인
- 화면에 보이는 일반 `TEXT.text`도 `선택`, `기본`, `selected`, `default`, `active` 같은 상태 단어 때문에 exporter가 상태를 과추론할 수 있는지 확인
- 현재 상태가 아닌 affordance 설명이라면 `옵션`, `입력`, `트리거`, `열기`, `해제`, `지정` 같은 중립 표현으로 바꿀지 확인
- 상위/하위 계층이 의도대로 표현됐는지 확인
- 함께 움직여야 할 요소가 `GROUP` 또는 `autoGroupChildren`으로 묶였는지 확인
- `FRAME`/`SECTION`/`COMPONENT` 내부 자식의 `x`, `y`가 부모 기준 local 좌표인지 확인
- 카드, 버튼, 입력 필드 같은 컨테이너 내부 텍스트/아이콘이 부모 bounds를 비정상적으로 크게 벗어나지 않는지 확인
- 멀티라인 `TEXT`가 있으면 `\\n`가 아닌 `\n`으로 저장됐는지 확인
- 멀티라인 `TEXT`가 의도한 줄수라면 `width`와 `textAutoResize` 설정이 있는지 확인
- 멀티라인 제목/설명 아래의 카드, 버튼, 배지가 텍스트 영역을 침범하지 않는지 확인
- 텍스트와 다음 블록 요소 사이에 최소 안전 여백이 유지되는지 확인
- `clipsContent: true` screen에서 마지막 CTA/패널이 하단에서 잘려 보이지 않는지 확인
- 하단 CTA/패널의 본체뿐 아니라 shadow/effect 영역까지 포함해 루트 bounds 안에 들어오는지 확인
- 주요 interactive node에 `semantic.id`가 있는지 확인
- `navigate` / `open_component` / `row|column|button|list|pageView` 오해 가능 node에 semantic 보강이 필요한지 확인

## Semantic Gate

- `08-semantic-quality-gate.md` 기준으로 root compile readiness 점검
- semantic 의미가 있는 root/node의 `semantic.id`가 문서 내에서 유일한지 확인
- screen root면 `route` 존재와 `flow` 필요 여부 확인
- component root면 `component.name` 존재 확인
- 버튼, 리스트 row, app bar action, 탭 카드 등 주요 action node에 semantic을 남겼는지 확인
- 실제 동작이 있는 interactive node는 `semantic.type`만 두지 말고 `semantic.interaction.onTap.type` 또는 동등한 구조화 intent가 있는지 확인
- checkbox/radio/tab/date picker trigger 같은 상태형 control이 generic `button`/`textField`로만 남아 있지 않은지 확인
- 한 row 안에 toggle과 detail navigation 등 복합 affordance가 섞여 있으면 action 분리 또는 primary action 구조화가 되었는지 확인
- visual만 보면 layout intent가 흔들리는 frame에 `semantic.type=row|column`이 필요한지 확인
- navigation target이 route인지 `targetId`인지 모호하지 않은지 확인
- `label`/`notes`가 구조화 가능한 action intent를 대신하고 있지 않은지 확인
- `label`/`notes`는 정말 필요한 설명만 담고 있는지 확인
- `meta.instanceOf` 같은 raw component/variant 메타가 있더라도 실제 앱 의미가 필요한 상태 차이는 `semantic` 또는 `state`로 따로 표현됐는지 확인
- Figma variant 이름/property를 그대로 source-of-truth처럼 믿고 semantic/state 보강을 생략하지 않았는지 확인
- purely visual variant 차이만 있는 경우 semantic/state를 과도하게 추가하지 않았는지 확인
- variant 차이가 source-of-truth visual 계약이라면 raw trace 메타만 남기지 말고 `componentVariants`로 구조화됐는지 확인
- `componentVariants`를 썼다면 `currentVariant`와 각 variant diff가 실제로 필요한 visual/action 차이만 담고 있는지 확인
- 현재 상태가 실제 runtime meaning이라면 `label`, `notes`, visible text에만 의존하지 말고 명시 `state` 필드로 표현했는지 확인
- node-level token/asset reference 같은 compiler enrichment 정보를 source에 기본값처럼 추가하지 않았는지 확인
- compiler에 중요한 intent만 semantic으로 기록하고, purely visual node에는 불필요한 semantic을 남발하지 않았는지 확인

## 저장 후

- 플러그인 `State`가 `connected` 또는 `reconnecting`인지 확인
- 프레임이 중복 생성되지 않는지 확인
- 렌더 결과가 기존 위치에서 교체되는지 확인
- 자동 그룹을 썼다면 Figma에서 관련 자식이 한 그룹으로 선택되는지 확인
- 버튼 상태(`Set Active File`, `Start Realtime Sync`)가 의도대로 동작하는지 확인

## 문제 발생 시 빠른 진단

1. 상태 메시지 확인
2. 파일이 `ui_spec/samples/` 하위인지 확인
3. JSON 루트 `type` 확인
4. sync URL 확인 (`http://127.0.0.1:4311`)
5. `Refresh Files` 후 재선택
6. 줄 수가 늘어난 텍스트 아래 요소의 `y` 값이 그대로 남아 있지 않은지 확인
7. 비어 보이는 카드/버튼이 있으면 내부 자식의 `x`, `y`가 부모 local 좌표가 아니라 화면 기준으로 들어간 것은 아닌지 확인
8. `strokes`에 문자열 shorthand가 들어가 있지 않은지 확인
9. root/node `label` 또는 `notes`가 상태 전이 설명 때문에 unintended `state:selected/default`로 읽힐 여지가 없는지 확인
10. title, placeholder, CTA, 배지 텍스트 같은 visible text가 unintended `state:selected/default`를 유발하지 않는지 확인
11. state를 source에 명시하지 않은 경우, exporter가 텍스트를 보고 formal `state` field를 자동 생성해 줄 것이라고 기대하지 않았는지 확인
12. 하단 CTA/패널이 보이면 `clipsContent`와 effect 때문에 루트 바깥에서 잘린 것은 아닌지 확인
13. export 대상 파일인데 최상위가 `SECTION`이고 실제 screen/component root가 child `FRAME`에만 들어간 상태는 아닌지 확인
