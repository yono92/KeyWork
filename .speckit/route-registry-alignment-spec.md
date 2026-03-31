# 라우트 레지스트리 정렬 (Route Registry Alignment) — 구현 스펙

## 개요

랜딩, 게임 메뉴, 헤더, sitemap, manifest, README, E2E가 서로 다른 라우트 목록을 들고 있어 정보가 드리프트된 상태를 정리한다. 실제 구현된 공개 라우트를 단일 registry에서 관리하고, 그 registry를 기반으로 UI/메타/테스트를 동기화한다.

## 유저 스토리

### [P1] US-01: 실제 제공 라우트만 일관되게 노출
> 사용자로서, 랜딩/메뉴/검색 메타/테스트가 실제 존재하는 라우트와 일치하길 원한다.

**Acceptance Criteria:**
- Given 앱 랜딩, 사이드 메뉴, sitemap, manifest, README를 확인할 때
- When 라우트 목록을 비교하면
- Then 실제 구현된 공개 라우트만 노출되고, 서로 다른 목록이 나타나지 않는다

### [P1] US-02: 보조 페이지도 올바른 헤더 상태 표시
> 사용자로서, 랭킹/프로필/대전 화면에서도 헤더 제목, 아이콘, 강조색이 현재 페이지에 맞게 보이길 원한다.

**Acceptance Criteria:**
- Given `/leaderboard`, `/profile`, `/tetris/battle`, `/word-chain/battle` 진입 시
- When 상단 헤더를 보면
- Then 각 경로에 대응하는 제목, 아이콘, 강조색이 fallback 없이 표시된다

### [P1] US-03: 배포 빌드에서 lint 회귀 즉시 감지
> 개발자로서, `next build`가 lint를 건너뛰지 않고 기본 품질 게이트를 수행하길 원한다.

**Acceptance Criteria:**
- Given 프로덕션 빌드를 실행할 때
- When `npm run build`를 수행하면
- Then lint와 타입 검사까지 포함한 빌드가 수행된다

### [P2] US-04: 관리자 stats API 권한 계약 검증
> 개발자로서, 관리자 API의 인증/권한 실패와 정상 응답 계약이 테스트로 보호되길 원한다.

**Acceptance Criteria:**
- Given `app/api/admin/stats/route.ts`
- When 테스트를 실행하면
- Then `401`, `403`, `200` 케이스가 모두 검증된다

## 기능 요구사항

### FR-001: 단일 라우트 registry
- `src/features/game-shell/config.ts`에서 게임 라우트와 보조 라우트를 함께 정의한다
- 각 라우트는 최소한 `path`, `icon`, `accent`, `title`, `landingVisible`, `sitemap` 메타를 가진다
- 랜딩 노출용 목록과 sitemap 목록은 registry에서 파생된다

### FR-002: 랜딩/메뉴 정렬
- `app/page.tsx`는 하드코딩 목록 대신 registry 기반 카드 렌더링을 사용한다
- `NavMenu.tsx`는 별도 visible 목록을 유지하지 않고 registry 기준으로 메뉴를 그린다

### FR-003: 헤더 경로 해석 정렬
- `Header.tsx`는 현재 pathname을 registry에서 조회한다
- `/leaderboard`, `/profile`, battle 경로는 전용 아이콘과 accent를 가진다
- 미등록 경로만 기본 fallback을 사용한다

### FR-004: 메타/문서/테스트 정렬
- `app/sitemap.ts`는 registry 기반 공개 라우트만 노출한다
- `app/manifest.ts`, `README.md`, `AGENTS.md`는 실제 구현된 모드 수와 라우트 집합을 반영한다
- E2E 스크린샷 테스트는 존재하지 않는 `/typing-defense`, `/dictation`를 참조하지 않는다

### FR-005: 품질 게이트
- `next.config.ts`에서 build lint skip 설정을 제거한다
- route registry와 admin stats route는 단위 테스트로 보호한다

## 관련 파일

| 파일 | 역할 |
|------|------|
| `src/features/game-shell/config.ts` | 라우트 registry와 파생 상수 |
| `app/page.tsx` | 랜딩 카드 렌더링 |
| `src/components/navigation/NavMenu.tsx` | 게임 메뉴 렌더링 |
| `src/components/Header.tsx` | 페이지 타이틀/아이콘/강조색 |
| `app/sitemap.ts` | 공개 sitemap 생성 |
| `app/manifest.ts` | PWA 설명 메타 |
| `README.md` | 공개 문서 |
| `next.config.ts` | build 품질 게이트 |
| `tests/features/game-shell-config.test.ts` | route registry 단위 테스트 |
| `tests/api/admin-stats.route.test.ts` | 관리자 stats API 계약 테스트 |
