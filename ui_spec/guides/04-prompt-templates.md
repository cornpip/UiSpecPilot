# 04. Prompt Templates

에이전트에게 `ui_spec` 생성/수정을 요청할 때 쓸 수 있는 템플릿입니다.

## 새 화면 생성

```text
ui_spec/samples/20260310_175200_new_screen.json 파일을 만들어줘.
모바일 360x800 FRAME 루트로 시작하고,
배경은 연한 그라데이션,
상단 제목 텍스트와 카드 3개를 넣어줘.
줄바꿈이 필요한 텍스트는 `\n`을 사용하고, 멀티라인 TEXT에는 width도 지정해줘.
지원 타입만 사용해줘.
```

## 기존 파일 수정

```text
ui_spec/samples/start.json 수정해줘.
카테고리 카드 3개(영양제/화장품/헤어)로 구성하고,
각 카드에 아이콘, 제목, 설명, 오른쪽 chevron을 넣어줘.
```

## 안정성 우선 요청

```text
ui_spec/samples/detail.json을 수정하되,
루트 구조(type/size)는 유지하고 children만 바꿔줘.
저장 전 JSON 문법이 맞는지 확인해줘.
멀티라인 텍스트가 있으면 `\\n`가 아니라 `\n`인지 확인해줘.
```

## 디버깅 요청

```text
현재 ui_spec/samples/profile.json이 렌더 실패해.
왜 실패하는지 원인 3개로 좁히고,
최소 수정으로 동작하게 고쳐줘.
```
