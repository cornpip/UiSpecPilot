# FLUTTER_APP_BASELINE

`flutter_ir` 기반 Flutter codegen 시 적용하는 앱 구조 기본 가이드.

## Recommended Interpretation Order
1. 기존 프로젝트의 구현 방식 확인
2. IR의 구조화 필드와 prototype 정보 반영
3. `node.notes.memo` 반영
4. 위 세 단계로 결정되지 않는 공통 프로젝트 기본값은 이 문서를 적용

## Purpose
- IR만으로 결정되지 않는 공통 앱 구조 결정을 일관되게 만든다.
- 생성 결과가 매번 달라지지 않도록 기본 정책을 제공한다.
- 동시에 기존 프로젝트가 이미 가진 패턴을 불필요하게 깨지 않도록 한다.

## Top Rule
- 항상 기존 프로젝트 구조, 패턴, 공통 유틸, 라우팅 방식, 상태관리 방식을 먼저 확인한다.
- 같은 역할의 기존 구현이 이미 있으면 그것을 우선 재사용하거나 확장한다.
- 기존 파일을 수정하는 작업이라면 구조뿐 아니라 시각 스타일도 기존 화면 흐름에 자연스럽게 이어지도록 조정하는 것을 기본으로 한다.
- 단, IR이 전달하는 상태 의미, 핵심 위계, 사용자 노출 텍스트, 필수 affordance를 흐릴 정도로 스타일을 임의 치환하지는 않는다.
- 아래 규칙은 기존 프로젝트에 동일한 구조가 없을 때 기본값으로 적용한다.
- 즉, 이 문서의 모든 규칙은 `existing-first, fallback-to-baseline` 원칙 아래에서 동작한다.

## Localization
- locale은 `l10n` 구조를 기본으로 사용한다.
- 새 프로젝트이거나 기존 프로젝트에 로컬라이제이션 구조가 없다면 처음부터 `l10n`을 적용한다.
- 하드코딩된 사용자 노출 텍스트는 가능한 한 직접 넣지 말고 지역화 리소스로 분리한다.
- 기존 프로젝트가 이미 다른 locale 구조를 쓰고 있다면 그 구조를 우선 따른다.
- 기존 locale 리소스의 key를 재사용할 때는 의미 유사 여부가 아니라 실제 사용자 노출 문구가 동일하거나 조사/공백 차이 수준으로만 재사용하는 것을 기본으로 한다.
- 헤더, 서브헤더, CTA, placeholder, chip label, empty state 같이 화면 인상과 레이아웃에 직접 영향을 주는 텍스트는 기존 key가 있어도 문구가 다르면 새 key를 만드는 것을 우선한다.
- 특정 화면 맥락에 종속된 문구는 가능하면 범용 key로 억지 통합하지 말고 screen-scoped key로 분리하는 것을 우선한다.

## Database
- 로컬 DB가 필요하면 기본 저장소는 `sqlite`를 사용한다.
- 기존 프로젝트에 DB 계층이 없으면 기본 구조는 `database/model`, `database/repository`, `database/dao`로 둔다.
- 각 테이블은 가능하면 `model`, `repository`, `dao` 3계층을 기본 단위로 맞춘다.
- 테이블 이름 상수는 별도 상수 파일로 분리하는 것을 기본으로 한다.
- DB 초기화는 공통 helper에서 담당하고, 필요하면 `init_table.sql` 또는 migration 구조를 둔다.
- 기본 SQL 초기화 파일 경로는 `assets/sql/init_table.sql` 로 둔다.
- `DatabaseHelper`는 기본적으로 `assets/sql/init_table.sql` 을 읽어 초기 테이블을 생성하는 구조를 우선한다.
- `pubspec.yaml`에는 `assets/sql/init_table.sql` asset 등록을 포함하는 것을 기본으로 한다.

## Global Config
- 기본 init table은 `global_config` 테이블을 먼저 둔다.
- `global_config`에는 최소 `lang` 컬럼을 둔다.
- 앱 실행 시 `global_config.lang`이 비어 있으면 최초값으로 `ko`를 insert 또는 update 한다.
- 앱 locale은 시스템 locale이 아니라 최종적으로 `global_config.lang` 값을 기준으로 결정한다.
- locale 변경은 메모리 상태만 바꾸지 말고 `global_config` 테이블 update와 앱 상태 update가 함께 일어나야 한다.

## Riverpod Config State
- `global_config`는 `riverpod/` 아래 별도 state와 provider를 만들어 관리한다.
- 기본 구성은 `riverpod/state/global_config_state.dart` + `riverpod/global_config_provider.dart` 형태를 권장한다.
- provider는 초기 로드, 언어 변경, DB 반영, 앱 상태 반영을 한 곳에서 관리한다.
- locale 변경 시 provider가 DB update 후 최신 config를 다시 로드해 앱 전체 locale 전환이 일관되게 일어나도록 한다.

## Alert Utility
- 공통 alert/dialog helper가 이미 있으면 그것을 우선 사용한다.
- 없다면 기본 alert 클래스를 공통 util로 먼저 만든 뒤 이후 confirm/error/info dialog가 그 유틸을 통하도록 구성한다.
- 중복 dialog 구현을 여러 화면에 흩뿌리지 않는다.

## Scaffold Shell
- 기존 screen shell이나 scaffold wrapper가 있으면 그것을 우선 사용한다.
- 없다면 기본 screen 구조는 `Scaffold`의 `appBar`와 `endDrawer`를 사용하는 방향으로 잡는다.
- custom header를 만들더라도 기존 프로젝트에 AppBar 패턴이 있으면 별도 헤더보다 기존 AppBar 패턴을 우선한다.
- screen/page 최상단에 좌측 navigation button이 있는 header band가 보이면 body 내부 첫 row보다 `appBar.leading`으로 먼저 해석한다.
- screen/page 최상단 우측에 action button이 있는 경우도 body 내부 우측 정렬 버튼보다 `appBar.actions`로 먼저 해석한다.
- 단, 상단 영역이 banner/hero/intro visual 일부라서 일반 navigation bar와 성격이 다르면 custom header를 유지할 수 있다.
- `endDrawer`에는 기본적으로 `설정` 페이지로 이동하는 버튼을 포함하는 것을 권장한다.
- 기본적으로 `Scaffold`의 `appBar` 배경색과 `body` 배경색은 일치시키는 것을 우선한다.
- `AppBar`에는 기본적으로 `scrolledUnderElevation: 0` 옵션을 적용하는 것을 우선한다.

## Screen Route Convention
- route 진입 클래스는 screen에 해당하는 것으로 본다.
- route 진입 화면 파일은 기본적으로 `screen/` 또는 `screens/` 폴더 아래에 둔다.
- 파일 이름은 `~~_screen.dart` 포맷을 기본 규칙으로 사용한다.
- route 진입 클래스는 `Page`보다 `Screen` 명명 규칙을 우선한다.

## Settings Page
- 기존 프로젝트에 설정 페이지가 있으면 그것을 우선 확장한다.
- 없다면 기본적인 `설정` 페이지를 만든다.
- 설정 페이지에는 최소 한영 select box를 두고 `global_config.lang` 값을 변경할 수 있어야 한다.
- 위 select box는 가능하면 inline dropdown 대신 bottom sheet/modal selector용 공통 컴포넌트를 만들어 사용한다.
- 기존 프로젝트에 같은 역할의 공통 selector가 있으면 그것을 재사용하고, 없다면 `ModalSelectButton`, `ModalSelectField`처럼 `modal` 의미가 드러나는 이름의 컴포넌트를 기본으로 만든다.
- select box는 현재 locale 상태를 반영해야 하고, 변경 즉시 provider를 통해 DB update와 locale state update가 함께 일어나야 한다.
- modal selector는 탭 시 `showModalBottomSheet` 또는 동등한 modal presenter를 열고, 현재 선택값 강조, 옵션 탭 시 즉시 닫힘, 선택 결과를 `onChanged`로 전달하는 구조를 기본으로 한다.
- 설정 화면은 별도 route/page로 두고 `endDrawer`에서 접근 가능하게 하는 것을 기본으로 한다.

## Exit Confirmation
- 기존 프로젝트에 종료 확인 UX가 있으면 그 정책을 우선 따른다.
- 없다면 마지막 route history 상태에서 뒤로가기를 수행할 때 종료 확인 alert를 띄운다.
- 기본 문구는 `앱을 종료하시겠습니까?`로 한다.
- 사용자가 `확인`을 누르면 앱 종료를 진행한다.
- 이 동작은 screen별 중복 구현보다 공통 shell/router/back handler 레벨에서 처리하는 것을 우선한다.

## Short Invocation
요청문에 짧게 넣을 때는 아래 두 단계 중 하나를 사용할 수 있다.

### Basic
```text
기존 프로젝트 구조를 우선 따르고, 없을 때만 codegen/flutter/guide/FLUTTER_APP_BASELINE.md와 codegen/flutter/guide/IR_CODEGEN_BASELINE.md를 적용한다.
```

### Expanded
```text
기존 프로젝트 구조를 우선 따르고, 없을 때만 codegen/flutter/guide/FLUTTER_APP_BASELINE.md와 codegen/flutter/guide/IR_CODEGEN_BASELINE.md를 적용한다. locale은 l10n, 로컬 설정은 sqlite `global_config` + riverpod, 설정 페이지와 endDrawer settings entry, 마지막 back의 종료 확인 정책을 포함한다.
```
