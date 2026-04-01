# 02. Workflow

에이전트가 `ui_spec`을 다룰 때의 표준 작업 순서입니다.

## 생성/수정 순서

1. 대상 파일 결정 (`ui_spec/samples/*.json`)
2. 가이드 기준으로 화면 구조 결정
3. 기존 JSON이 있으면 스키마/필드 확인 용도로만 로드
4. 요청사항 반영
5. JSON 문법 검증
6. 파일 저장
7. 플러그인에서 `Set Active File` 확인
8. `Start Realtime Sync` 상태에서 결과 확인

## 실시간 sync 기준

- sync 시작 전: 반드시 `Set Active File`
- sync 중: 파일 저장만으로 자동 반영
- 리로드 발생 시: 이전 `autoSync` 상태면 재연결 시도
- Figma에서 `Extract to ui_spec`로 round-trip 저장할 때 semantic 보존은 기존 source의 `meta.figmaNodeId` 또는 렌더 시 심긴 `semantic.id` 기반 merge에 의존한다.
- hand-authored source를 처음 렌더한 직후에는 round-trip 저장 전후로 root와 주요 interactive node의 `semantic` 유지 여부를 다시 확인한다.

## 안전한 변경 전략

- 큰 변경은 한 번에 하지 말고 단계별 저장
- 루트 구조(`type`, `width`, `height`)는 신중히 수정
- `flutter_ir` export를 전제로 하는 파일은 한 파일이 한 구현 단위 `screen` 또는 `component`에 대응하도록 우선 설계한다.
- 상태 차이가 작으면 대표 상태 1개만 visual root로 두고, 필요한 node semantic과 짧은 notes로 상태 intent를 남긴다.
- 상태 차이가 커서 레이아웃이나 주요 블록 구성이 달라지면, 비교용 `SECTION` variant로 합치기보다 별도 `ui_spec` 파일로 분리하는 쪽을 우선 검토한다.
- 공통 스타일은 재사용 가능한 패턴으로 반복 적용
- 화면을 평면적으로 나열하지 말고 상위 블록, 하위 블록, 반복 묶음을 먼저 나눈 뒤 `children` 계층을 설계한다.
- 함께 선택/이동될 가능성이 높은 직계 자식 묶음은 `GROUP` 또는 `autoGroupChildren` 사용을 먼저 검토한다.
- 컨테이너 내부 자식 배치를 잡을 때는 먼저 부모 내부 local 좌표계로 환산한 뒤 저장한다. 카드/버튼/입력 필드 내부 자식에 화면 기준 절대 좌표를 그대로 쓰지 않는다.
- 멀티라인 텍스트를 넣을 때는 `\n` 사용 여부와 `TEXT.width` 지정 여부를 저장 전에 함께 확인
- 멀티라인 텍스트 아래에 다른 요소가 이어지면, 실제 줄 수를 기준으로 `y` 간격을 다시 계산해 겹침이 없는지 확인
- `clipsContent: true` screen에서 하단 CTA나 마지막 패널을 배치했다면, 본체뿐 아니라 shadow/effect가 루트 bounds 밖으로 잘리지 않는지 함께 확인한다.
- 초안 작성 직후에는 semantic self-review 전에 컨테이너 내부 텍스트/아이콘이 부모 bounds를 비정상적으로 벗어나지 않는지 먼저 확인한다.
- Figma에서 visual 편집 후 source file을 round-trip 저장했다면 semantic source of truth가 유지됐는지 diff 또는 semantic gate 기준으로 다시 확인한다.
- semantic이 빠진 round-trip 결과를 그대로 source of truth로 확정하지 않는다.
- 사용자 요청이 없는 새 화면 생성에서는 기존 `ui_spec`의 레이아웃을 복제하거나 암묵적으로 닮게 만들지 않는다.
- 기존 `ui_spec`를 읽더라도 구조, 좌표, 카드 배치, 시각 위계는 새 요청과 가이드 문서 기준으로 다시 설계한다.

## 권장 네이밍

- 새 `ui_spec` 파일 생성 시 기본 형식은 `YYYYMMDD_HHMMSS_<slug>.json` 으로 한다.
- 날짜와 시간은 파일 생성 시점 기준을 사용한다.
- 예: `20260310_175200_screen_todo_intro.json`
- 예: `20260310_175230_component_filter_chip.json`
- 예: `20260310_175300_draft_settings_layout.json`
- `<slug>`에는 화면 목적이나 컴포넌트 의미가 드러나게 짧게 쓴다.
- 기존 파일 수정 요청이 아닌 새 파일 생성 요청에서는 위 timestamp 형식을 우선 적용한다.
