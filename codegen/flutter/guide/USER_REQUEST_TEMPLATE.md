# USER_REQUEST_TEMPLATE

이 문서는 `./task flutter-codegen ...` 같은 task 프롬프트를 작성할 때, 어떤 정보를 같이 주면 좋은지 정리한 참고용 가이드다.

반드시 아래 형식을 그대로 복사해서 써야 하는 것은 아니다.
대신 아래 항목들을 task 프롬프트의 `Additional requirements`나 설명 문장에 상황에 맞게 녹여 넣으면 된다.

특히 입력 `flutter_ir.json`이 여러 개일 때는, 각 IR의 관계를 프롬프트에 함께 설명하는 것이 매우 중요하다.
그 설명이 없으면 codegen이 여러 IR을 각각 별도 페이지로 오해하거나, 반대로 서로 다른 페이지를 하나의 상태로 잘못 합칠 수 있다.

## Suggested Information

아래 정보들은 필요에 따라 선택해서 task 프롬프트에 포함하면 된다.

```text
타겟 프로젝트 폴더: <절대경로>
IR 파일 경로: <절대경로 또는 상대경로>
또는 IR 파일 목록:
- a: <절대경로 또는 상대경로>
- b: <절대경로 또는 상대경로>
- c: <절대경로 또는 상대경로>

기술 스택:
- 라우팅: <go_router | auto_route | Navigator | 기존 프로젝트 방식 유지>
- 상태관리: <riverpod | provider | bloc | 없음 | 기존 프로젝트 방식 유지>
- 생성 범위: <전체 | 특정 화면부터 closure 확장>

구현 요구사항:
- 연결된 screen/component까지 모두 구현
- `interaction.prototype`와 `node.notes.memo`를 함께 참고
- placeholder/stub/TODO 없이 실제 코드로 생성
- 기존 프로젝트 구조와 코드 스타일 최대한 유지
- 기존에 같은 역할의 구조가 있으면 그것을 우선 사용하고, 없을 때만 기본 가이드를 적용

추가 지시:
- <예: 기존 theme 사용>
- <예: lib/features/recommendation 아래에 생성>
- <예: 기존 라우터 파일 수정 허용>
- <예: codegen/flutter/guide/FLUTTER_APP_BASELINE.md 기준 적용>
- <예: codegen/flutter/guide/IR_CODEGEN_BASELINE.md 기준 적용>

여러 IR 관계 설명:
- <각 IR이 서로 다른 페이지인지, 같은 페이지의 다른 상태인지 명시>
- <같은 페이지라면 어떤 상태인지 명시: default / selected / empty / filled / loading / error 등>
- <어떤 사용자 액션으로 상태가 바뀌는지 명시>
- <어떤 버튼/탭/터치로 다른 페이지로 이동하는지 명시>
- <어느 페이지가 entry인지 명시>
- <별도 route/page로 생성해야 하는지, 하나의 page state로 합쳐야 하는지 명시>

산출물 요구:
- 수정/추가 파일 생성
- 라우터 연결 포함
- 필요한 provider/state 코드 포함
- 마지막에 어떤 파일을 만들었는지 요약
```

## Example Prompt Content

아래는 실제 task 프롬프트에 넣을 수 있는 예시 정보다.

```text
타겟 프로젝트 폴더: ~~
IR 파일 목록:
- a: compilers/flutter_ir/examples/sample_flutter_ir_default.json
- b: compilers/flutter_ir/examples/sample_flutter_ir_selected.json
- c: compilers/flutter_ir/examples/sample_flutter_ir_register.json

기술 스택:
- 라우팅: go_router
- 상태관리: riverpod
- 생성 범위: 전체

구현 요구사항:
- 연결된 screen/component까지 모두 구현
- `interaction.prototype`와 `node.notes.memo`를 함께 참고
- placeholder/stub/TODO 없이 실제 코드로 생성
- 기존 프로젝트 구조와 코드 스타일 최대한 유지
- 기존에 같은 역할의 구조가 있으면 그것을 우선 사용하고, 없을 때만 기본 가이드를 적용

추가 지시:
- 현재 프로젝트의 Flutter SDK 실행 규칙을 따른다
- 화면 파일과 공통 위젯 파일을 분리한다
- codegen/flutter/guide/FLUTTER_APP_BASELINE.md 기준 적용
- codegen/flutter/guide/IR_CODEGEN_BASELINE.md 기준 적용

여러 IR 관계 설명:
- a,b는 같은 페이지의 서로 다른 상태다. 하나의 페이지 `AA`로 구현한다.
- a는 기본 상태다. 멤버가 선택되지 않았고 guest가 기본 선택되어 있다.
- b는 멤버 선택 상태다. 사용자가 멤버 리스트에서 특정 멤버를 선택한 뒤의 화면이다.
- a,b를 별도 route/page로 만들지 말고 하나의 stateful page 또는 동일 route 내부 상태 변화로 구현한다.
- c는 `AA`와 별도인 신규 등록 페이지다.
- `AA`에서 `신규 등록` 버튼을 누르면 c 페이지로 이동한다.
- `AA`는 intro page에서 진입하는 다음 페이지다.

산출물 요구:
- 수정/추가 파일 생성
- 라우터 연결 포함
- 필요한 provider/state 코드 포함
- 마지막에 어떤 파일을 만들었는지 요약
```

## Short Additional Instruction Examples

### Basic
```text
기존 프로젝트 구조를 우선 따르고, 없을 때만 codegen/flutter/guide/FLUTTER_APP_BASELINE.md와 codegen/flutter/guide/IR_CODEGEN_BASELINE.md를 적용한다.
```

### Expanded
```text
기존 프로젝트 구조를 우선 따르고, 없을 때만 codegen/flutter/guide/FLUTTER_APP_BASELINE.md와 codegen/flutter/guide/IR_CODEGEN_BASELINE.md를 적용한다. locale은 l10n, 로컬 설정은 sqlite `global_config` + riverpod, 설정 페이지와 endDrawer settings entry, 마지막 back의 종료 확인 정책을 포함한다.
```

## Multi-IR Writing Guide

여러 개의 `flutter_ir.json`을 함께 제공할 때는 단순히 "이 파일들도 참고"라고만 쓰지 않는 편이 좋다.
가능하면 아래 정보를 task 프롬프트 안에 같이 적어준다.

- 각 IR이 서로 다른 페이지인지, 같은 페이지의 상태 변형인지
- 같은 페이지라면 각 IR이 어떤 상태를 나타내는지
- 상태 전환 트리거가 무엇인지
- 페이지 간 이동 트리거가 무엇인지
- 어느 페이지가 시작 화면(entry)인지
- route를 분리해야 하는지, 하나의 page state로 합쳐야 하는지

예를 들어 이런 식의 설명이 도움이 된다:

```text
- a,b는 같은 페이지의 서로 다른 상태다.
- a는 default 상태이고, b는 selected 상태다.
- 리스트에서 멤버를 선택하면 a 상태에서 b 상태로 전환된다.
- a,b는 separate page가 아니라 single page state로 구현한다.
- c는 별도 페이지다.
- AA 페이지에서 "신규 등록"을 누르면 c 페이지로 이동한다.
```
