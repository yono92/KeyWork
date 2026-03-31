# Route Registry Alignment — Plan

## 목표

- 단일 route registry를 만들고 UI/메타/문서/테스트를 그 정의에 맞춘다.

## 작업 순서

1. `src/features/game-shell/config.ts`에 게임 라우트와 보조 라우트 메타데이터를 통합한다.
2. 랜딩, 헤더, 네비게이션이 registry에서 직접 파생된 값을 사용하도록 바꾼다.
3. sitemap, manifest, README, AGENTS를 실제 구현 라우트 기준으로 정리한다.
4. E2E에서 죽은 경로(`/typing-defense`, `/dictation`) 참조를 제거하거나 실제 경로로 치환한다.
5. `next.config.ts`에서 build lint skip 설정을 제거한다.
6. route registry 테스트와 admin stats route 테스트를 추가한다.
7. `npm run lint`, `npm run test:run`, `npm run build`를 실행하고 checklist를 완료 처리한다.

## 리스크

- 기존 테스트가 하드코딩된 라우트 라벨에 의존하고 있어 registry 도입 후 일부 갱신이 필요하다.
- 보조 페이지용 아이콘 타입을 게임 메뉴 아이콘 타입과 섞으면 타입 경계가 흐려질 수 있으므로 분리한다.
