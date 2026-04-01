# 01. Schema Rules

`ui_spec` 생성 시 반드시 지켜야 하는 최소 스키마 규칙입니다.
작업 시작 전에는 먼저 `ui_spec/guides/AUTHORING_GUIDE.md`를 읽고, 전체 authoring 흐름과 관련 guide 구성을 확인한 뒤 이 문서로 돌아옵니다.
이 문서는 현재 `ui_spec` source contract 중 "허용 필드와 작성 규칙"을 담당합니다.
즉 authoring 단계에서 어떤 구조와 표현을 source-of-truth로 허용할지 이 문서가 정합니다.

## 필수 규칙

- 최상위는 JSON 객체
- 최상위에 `type` 필수
- `type` 값은 지원 타입 목록에 포함
- 색상은 `#RRGGBB` 또는 `#RRGGBBAA` 형식 권장
- `fills`는 문자열 색상 shorthand 또는 paint 객체를 사용할 수 있지만, `strokes`는 현재 플러그인 기준으로 반드시 `{ "color": "#..." }` 형태의 객체 배열 사용
- `DROP_SHADOW` / `INNER_SHADOW` effect는 현재 플러그인 구현 기준으로 `color`, `x`, `y`, `blur`, `spread` 키를 우선 사용. `offsetX`, `offsetY`, `radius` 같은 임의 축약 키에 의존하지 말 것
- 좌표/크기 값은 숫자 사용
- 루트 node의 직계 자식 좌표는 루트 기준으로 작성하고, `FRAME`/`GROUP`/`SECTION`/`COMPONENT` 내부 `children` 좌표는 반드시 부모 기준 local 좌표로 작성
- 카드, 버튼, 입력 필드, 리스트 row 내부의 아이콘/텍스트/배지 좌표를 화면 전체 기준처럼 다시 쓰지 말 것
- `TEXT.text`에서 줄바꿈이 필요하면 문자열 안에 실제 JSON 개행 escape인 `\n` 사용
- `TEXT.text`에 문자 그대로 `\\n`를 넣지 말 것. Figma에서 `\n` 텍스트가 보이거나 줄바꿈이 깨질 수 있음
- 멀티라인 `TEXT`는 가능하면 `width`와 `textAutoResize: "HEIGHT"`를 함께 지정해 줄바꿈 위치를 안정화
- 멀티라인 `TEXT` 바로 아래에 카드/버튼/배지 같은 블록 요소가 오면, 예상 텍스트 높이 아래에 최소 12-16px 이상의 여백을 확보

## 권장 루트 형태

```json
{
  "type": "FRAME",
  "name": "Screen Name",
  "x": 100,
  "y": 100,
  "width": 360,
  "height": 800,
  "fills": [
    {
      "type": "GRADIENT_LINEAR",
      "stops": [
        { "color": "#F8F9FF", "position": 0 },
        { "color": "#F1F4FF", "position": 1 }
      ]
    }
  ],
  "children": []
}
```

## 자주 나는 실패 패턴

- `type` 누락
- 루트가 배열/문자열
- 지원하지 않는 타입 사용
- 잘못된 JSON 문법(쉼표/따옴표)
- `strokes`를 `["#EAEAEA"]`처럼 문자열 배열로 저장해서 플러그인 런타임이 `stroke.color`를 읽다가 실패
- shadow effect에 플러그인이 읽지 않는 임의 키만 넣어서 의도한 그림자 값이 반영되지 않음
- `FRAME`/`GROUP` 내부 자식 좌표를 부모 기준이 아니라 화면 전체 기준처럼 적어서 내부 텍스트/아이콘이 프레임 밖으로 밀려 렌더가 비어 보임
- 의도한 줄바꿈을 `\n` 대신 `\\n`로 저장해서 텍스트가 깨짐
- 멀티라인 `TEXT`에 폭 지정 없이 자동 리사이즈만 써서 줄바꿈 위치가 렌더마다 달라짐
- 제목이 실제 렌더에서 한 줄 더 늘어났는데 아래 카드 위치를 고정해 둬서 요소가 서로 겹침

## 타입별 최소 예시

- `TEXT`: `text`, `x`, `y`를 함께 지정 권장
- `ICON`/`SVG`: `svg` 또는 `svgUrl` 필요
- `GROUP`: `children` 최소 1개 필요

## Paint / Stroke 작성 규칙

- 단색 배경 `fills`는 `["#FFFFFF"]`처럼 문자열 shorthand 사용 가능
- gradient/image `fills`는 기존 paint 객체 형태 사용
- `strokes`는 shorthand 문자열을 허용하지 않고 아래처럼 객체 배열로 고정

```json
"strokes": [
  {
    "color": "#E8EAF2",
    "weight": 1
  }
]
```

- shadow effect는 아래 형태를 기본으로 사용

```json
"effects": [
  {
    "type": "DROP_SHADOW",
    "color": "#11131822",
    "x": 0,
    "y": 8,
    "blur": 24,
    "spread": 0
  }
]
```

## 그룹/계층 작성 규칙

- 시각적으로나 의미상 함께 움직여야 하는 요소 묶음은 계층으로 표현한다.
- 카드, 패널, 배경 컨테이너처럼 배경/그라데이션/라운드/그림자를 가진 상위 블록은 우선 `FRAME` 또는 `RECTANGLE`로 만든다.
- 아이콘 + 텍스트 한 줄, 프로필 묶음, 카드 내부 메타 정보처럼 함께 선택/이동할 가능성이 높은 묶음은 `GROUP` 또는 자동 그룹 옵션으로 표현한다.
- 부모가 `FRAME` 또는 유사 frame-like node이면, 그 내부 자식의 `x`, `y`는 항상 부모 내부 원점 기준으로 다시 계산한다.
- 부모 노드의 직계 자식 전체를 렌더 후 한 번에 묶고 싶으면 `autoGroupChildren: true`를 사용한다.
- 자동 그룹 이름을 지정하고 싶으면 `autoGroupName`을 함께 사용한다.
- 이미 부분 묶음이 분명하면 `GROUP`을 명시적으로 중첩해 구조를 표현하고, 단순 반복 블록은 `autoGroupChildren`으로 마무리한다.

## Component Variant Rules

- Figma component/variant 원문 정보는 `meta.instanceOf` 같은 trace 메타로 보존할 수 있지만, 그것 자체를 앱 런타임 의미의 source-of-truth로 삼지 않는다.
- Figma variant 이름이나 property key/value를 그대로 semantic 규칙처럼 복사하지 않는다.
- variant 차이가 실제 앱 의미를 가지면 그 의미는 `semantic` 또는 `state`에 별도로 승격해 표현한다.
- `selected`, `checked`, `default`, `active`, `disabled` 같은 control state는 우선 `state` 또는 명시 semantic으로 표현한다.
- `guest`, `member`, `admin`처럼 도메인 의미 차이는 raw variant 이름에만 남기지 말고 `semantic.label`, `semantic.notes`, 구조화 interaction 등 현재 스키마가 허용하는 정식 semantic 채널로 드러낸다.
- variant 차이가 "현재 선택 요약 카드에 어떤 엔티티가 반영되는가" 같은 핵심 UX 관계를 뜻하면, 새 전용 variant 스키마를 먼저 늘리기보다 현재 스키마의 `semantic` / `state` / structured interaction 안에서 최소 의미를 우선 표현한다.
- purely visual variant라면 semantic/state로 억지 승격하지 말고 trace 메타와 실제 시각 차이만 유지한다.
- 여러 variant 후보가 있어도 export 대상 `ui_spec`는 여전히 하나의 대표 visual state를 기본으로 유지한다.
- 나머지 variant 중 runtime 의미 차이는 `semantic` / `state` / structured interaction으로 보강하고, source-of-truth visual/action diff는 필요할 때 `componentVariants`에 구조화한다.
- 같은 의미를 raw variant 메타와 `semantic`/`state`에 중복 기록할 때는 `semantic`/`state`를 source-of-truth로 보고, raw variant 메타는 round-trip과 inspection 용도로만 남긴다.
- 단, variant별 시각 차이 자체가 downstream 구현 정확도에 직접 영향을 주면 raw trace 메타만으로 끝내지 말고 `componentVariants` 정식 필드에 variant visual diff를 기록한다.

### `componentVariants` 도입 규칙

- `componentVariants`는 모든 node에 붙이는 기본 필드가 아니다.
- 같은 visual shell이 variant에 따라 stroke/fill/effect/badge/trailing action처럼 명확한 차이를 가지며, 그 차이가 source-of-truth로 남아야 할 때만 사용한다.
- `componentVariants`는 raw Figma variant 목록을 복사하는 용도가 아니라, 현재 source가 책임지는 variant별 visual/action 계약을 기록하는 용도다.
- 대표 visual state 하나만 렌더 트리에 두고 나머지 variant는 압축 기록할 때, 실제로 달라지는 속성만 최소 diff로 적는 것을 우선한다.
- `componentVariants`에 있더라도 앱 의미는 여전히 `semantic`/`state`에 남겨야 한다. 예를 들어 current-selection slot, default, selected 같은 관계를 visual diff만으로 암시하지 않는다.
- 권장 최소 포함 항목은 `currentVariant`, `variants[*].surface.fills|strokes|effects`, 필요 시 `badge`, `text`, `trailingAction`이다.
- variant visual 차이를 prose `notes`로 길게 설명하는 대신, 구조화 가능한 항목은 `componentVariants`로 옮기는 것을 우선한다.

## 자동 그룹 예시

```json
{
  "type": "FRAME",
  "name": "Promo Card",
  "x": 24,
  "y": 180,
  "width": 312,
  "height": 180,
  "cornerRadius": 28,
  "fills": [
    {
      "type": "GRADIENT_LINEAR",
      "stops": [
        { "color": "#FFF5E8", "position": 0 },
        { "color": "#FFE5CF", "position": 1 }
      ]
    }
  ],
  "autoGroupChildren": true,
  "autoGroupName": "Promo Card Content",
  "children": [
    {
      "type": "TEXT",
      "x": 20,
      "y": 20,
      "text": "혜택 카드",
      "fontSize": 20,
      "fontWeight": "bold",
      "fills": ["#2A2E39"]
    },
    {
      "type": "GROUP",
      "name": "Status Row",
      "children": [
        {
          "type": "ELLIPSE",
          "x": 20,
          "y": 58,
          "width": 12,
          "height": 12,
          "fills": ["#FF8A3D"]
        },
        {
          "type": "TEXT",
          "x": 40,
          "y": 52,
          "text": "오늘 사용 가능",
          "fontSize": 14,
          "fontWeight": "regular",
          "fills": ["#5A6070"]
        }
      ]
    }
  ]
}
```
