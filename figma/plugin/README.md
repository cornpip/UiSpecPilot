# ui_spec_to_figma

JSON UI spec input을 받아 Figma Canvas에 노드를 생성하는 플러그인입니다.

이제 플러그인은 `ui_spec -> Figma` 뿐 아니라, plugin이 생성한 Figma root node를 다시 active `ui_spec` 파일로 되가져오는 `Extract to ui_spec` 흐름도 지원합니다.

## If You Want To Create a `ui_spec`

`ui_spec`을 처음 만드는 사용자라면 아래 순서로 시작하면 됩니다.

1. 저장소 루트에서 `./task create-spec "원하는 화면 설명"`을 실행해 에이전트에 붙여넣을 프롬프트를 준비합니다.
2. 로컬에서 bridge 서버를 실행합니다.
3. Figma 플러그인에서 대상 JSON 파일을 선택하고 `Set Active File`을 실행합니다.
4. Figma에 렌더된 결과를 확인하고, 필요한 레이아웃/텍스트/스타일 수정 사항을 다시 요청합니다.

원하면 Bash에서 아래 명령으로 `./task` 탭 자동완성을 켤 수 있습니다.

```bash
source completions/task.bash
```

빠르게 말하면:

`README 확인 -> ./task create-spec 실행 -> 에이전트에 프롬프트 전달 -> bridge 서버 실행 -> Figma에서 확인 -> 반복 수정`

예:

```bash
./task create-spec "로그인 화면용 ui_spec 만들어줘"
```

## What This Plugin Covers

지원 노드 타입:

- `FRAME`
- `GROUP`
- `SECTION`
- `COMPONENT`
- `RECTANGLE`
- `TEXT`
- `ELLIPSE`
- `LINE`
- `POLYGON`
- `STAR`
- `SVG`
- `ICON`

지원 스타일/속성:

- 레이아웃: `x`, `y`, `width`, `height`, `constraints`
- 공통 비주얼: `opacity`, `blendMode`, `rotation`, `visible`, `locked`
- 코너: `cornerRadius`, `cornerRadii`
- 채우기(`fills`): `#RRGGBB`, `#RRGGBBAA`, `SOLID`, `GRADIENT_LINEAR`, `GRADIENT_RADIAL`, `GRADIENT_ANGULAR`, `GRADIENT_DIAMOND`, `IMAGE` (외부 URL)
- 테두리(`strokes`): `color`, `weight`, `align`, `dashes`
- 이펙트(`effects`): `DROP_SHADOW`, `INNER_SHADOW`, `LAYER_BLUR`, `BACKGROUND_BLUR`
- 텍스트: `fontFamily`, `fontStyle`, `fontSize`, `lineHeightPx`, `letterSpacingPx`, `textCase`, `textDecoration`, `textAlignHorizontal`, `textAlignVertical`, `textAutoResize`
- 오토레이아웃(지원 범위 내): `layoutMode`, `itemSpacing`, `padding*`, `layoutAlign`, `layoutGrow`, `layoutPositioning`
- 그룹화: 명시적 `GROUP`, 부모 직계 자식 자동 그룹화(`autoGroupChildren`, `autoGroupName`)

아이콘 처리:

- `ICON` 타입은 `svg` 또는 `svgUrl`을 받아 노드를 만들고 `color`로 리컬러링합니다.

## What Is Not Covered Yet

- `INSTANCE` 생성/variant 속성 적용
- `VECTOR`의 고급 path 데이터 직접 구성
- Variables(토큰 바인딩) 직접 연결
- Prototype interaction/flow 구성 자동화
- full `ui_spec.semantic` 편집 UI 구현

현재는 root-level `semantic` 최소 편집만 지원합니다. `Update Active ui_spec`는 active file의 semantic merge를 지원하고, `Extract New ui_spec`는 optional `Semantic Source`를 골라 그 semantic을 merge하거나 source 없이 새 JSON을 만들 수 있습니다. 재실행 후에도 유지되는 UI 상태는 `Sync URL`과 window size뿐이며, file/target/semantic source 선택은 새로 열 때 비워집니다. node-level 편집은 아직 미구현입니다.

## Grouping Guidance

- 상위 컨테이너와 하위 콘텐츠를 계층으로 나눠 `children` 구조를 먼저 잡는 것을 권장합니다.
- 카드나 패널처럼 배경이 있는 상위 블록은 `FRAME` 또는 `RECTANGLE`로 만들고, 내부의 함께 움직일 요소 묶음은 `GROUP`으로 표현합니다.
- 부모의 직계 자식을 렌더 후 자동으로 하나의 그룹으로 묶고 싶다면 `autoGroupChildren: true`를 사용합니다.
- 자동 생성 그룹 이름은 `autoGroupName`으로 지정할 수 있습니다.

## Usage

1. 플러그인 실행
2. 서버 URL을 확인하고 파일을 선택
3. `Set Active File` 실행

## Active File Workflow

또한 플러그인 UI의 `Extract to ui_spec` 섹션에서 현재 target node를 다시 JSON으로 저장할 수 있습니다. 이 흐름은 plugin이 생성한 root node에서만 허용됩니다. `Update Active ui_spec`는 `Set Active File`이 먼저 필요하며 active file의 semantic을 기준으로 merge한 뒤 같은 파일을 갱신합니다. `Extract New ui_spec`는 `Semantic Source`를 선택하면 그 파일의 semantic을 merge한 새 JSON 파일을 `ui_spec/samples/YYYYMMDD_HHMMSS_<slug>.json` 형식으로 생성하고, 선택하지 않으면 semantic 없이 새 JSON을 생성합니다. export된 JSON에는 `meta.roundTripVersion`, `meta.figmaNodeId`, `meta.figmaNodeType`, `meta.warnings`가 포함되어 추출 출처를 보존합니다.

같은 active file 기준으로 `Export Active File to Flutter IR`도 지원합니다. 이 버튼은 현재 `Set Active File` 된 `ui_spec` 원본을 서버에서 `flutter_ir`로 변환해 `compilers/flutter_ir/out/YYMMDD_HHMMSS_<source-file-basename>.flutter_ir.json` 형식으로 저장합니다. 변환 시점 타임스탬프를 앞에 붙이고, 뒤에는 원본 `ui_spec` 파일 basename을 그대로 재사용합니다. 이 흐름은 Figma canvas를 다시 역직렬화하지 않고 active source file을 직접 변환하므로 source-of-truth가 흔들리지 않습니다.

plugin이 생성한 root node가 아니면 extract 버튼은 비활성화되며, 안내 문구로 이유를 표시합니다.

1. 로컬 bridge 서버 실행

```bash
npm run bridge-server
```

기본 시작 파일은 `ui_spec/samples/start.json` 입니다.
파일 목록은 `ui_spec/samples` 폴더 하위의 `.json`만 노출됩니다.

2. 플러그인에서 서버 URL 확인 (기본: `http://127.0.0.1:4311`)
3. `Refresh Files`로 `ui_spec/samples` 하위 JSON 목록 로드
4. 드롭다운에서 시작할 JSON 파일 선택
5. `Set Active File` 실행

서버 API(필요 시):

- `GET /health`: 상태 확인
- `GET /files`: `ui_spec/samples` 하위 JSON 파일 목록
- `POST /watch`: 활성 감시 파일 전환 (`{ \"file\": \"relative/path.json\" }`)
- `GET /spec`: 현재 스펙 스냅샷
- `GET /spec?file=...`: watch 전환 없이 특정 JSON 스냅샷 읽기
- `POST /spec`: JSON으로 스펙 업데이트 + 파일 저장 + 브로드캐스트
- `POST /export-ir`: active file 또는 지정한 `ui_spec` 파일을 `flutter_ir`로 변환하고 `compilers/flutter_ir/out` 아래에 저장

`POST /spec`은 `{ "file": "ui_spec/samples/foo.json", "spec": { ... } }` 형식도 허용하므로, 플러그인이 현재 active file을 바꿔가며 Figma 수정본을 다시 저장할 수 있습니다.

`POST /spec` 예시:

```bash
curl -X POST http://127.0.0.1:4311/spec \
  -H "Content-Type: application/json" \
  -d @ui_spec/samples/start.json
```

또는 `{ "spec": { ... } }` 포맷도 허용합니다.

`POST /export-ir` 예시:

```bash
curl -X POST http://127.0.0.1:4311/export-ir \
  -H "Content-Type: application/json" \
  -d '{"file":"ui_spec/samples/start.json"}'
```

샘플 스펙은 [`../ui_spec.json`](../ui_spec.json) 참고.

## Development

요구사항:

- Node.js
- Figma Desktop App

개발 명령:

```bash
npm run watch
```

배포 빌드:

```bash
npm run build
```

## Install (Local)

1. Figma Desktop에서 파일 열기
2. `Import plugin from manifest…`
3. 프로젝트의 `manifest.json` 선택

## Notes

- 외부 이미지/SVG URL 렌더링을 위해 `networkAccess`가 설정되어 있습니다.
- `watch`는 타입체크 + 번들 재생성을 수행합니다.
