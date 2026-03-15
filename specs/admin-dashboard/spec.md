# 관리자 대시보드 — 스펙

## 사용자 스토리

1. **관리자**로서, `/admin`에 접속하여 전체 유저 목록을 조회하고 역할을 변경할 수 있다.
2. **관리자**로서, 게임 점수 기록을 조회하고 부정 기록을 삭제할 수 있다.
3. **관리자**로서, 활성 방 목록을 보고 비정상 방을 정리(삭제)할 수 있다.
4. **관리자**로서, 게임별 난이도 파라미터를 DB에서 수정하면 코드 배포 없이 반영된다.
5. **일반 유저**로서, `/admin`에 접근하면 메인으로 리다이렉트된다.

## 기능 요구사항

### FR-1: 역할(role) 시스템
- `profiles` 테이블에 `role TEXT DEFAULT 'user'` 컬럼 추가
- 값: `'user'` | `'admin'`
- RLS 정책: admin role 유저는 모든 테이블에 전체 CRUD 가능

### FR-2: 미들웨어 admin 체크
- `/admin` 및 `/admin/*` 경로 접근 시 Supabase에서 현재 유저의 role 확인
- role이 `'admin'`이 아니면 `/` 로 리다이렉트
- 미인증 유저도 `/` 로 리다이렉트

### FR-3: 관리자 대시보드 레이아웃
- `/admin` — 대시보드 홈 (통계 요약: 총 유저 수, 총 게임 수, 활성 방 수)
- `/admin/users` — 유저 목록 (닉네임, 역할, 가입일, 게임 수)
- `/admin/scores` — 점수 기록 (게임모드 필터, 정렬, 삭제)
- `/admin/rooms` — 방 목록 (상태 필터, 삭제)
- `/admin/game-config` — 게임 설정 (난이도 파라미터 편집)

### FR-4: 게임 설정 DB 관리
- `game_config` 테이블: `game_mode TEXT PK, config JSONB NOT NULL, updated_at TIMESTAMPTZ`
- 각 게임의 DIFFICULTY_CONFIG를 JSONB로 저장
- 클라이언트: 게임 시작 시 DB에서 config fetch, 실패 시 하드코딩 기본값 사용
- 관리자 UI에서 JSON 에디터로 수정

### FR-5: 유저 관리
- 유저 목록: 페이지네이션 (20명씩), 닉네임 검색
- 역할 변경: admin ↔ user 토글
- 유저 삭제 (Supabase auth.admin.deleteUser는 서버 사이드에서만)

### FR-6: 점수/방 관리
- 점수: 게임모드 필터, 최신순/점수순 정렬, 개별/일괄 삭제
- 방: 상태(waiting/playing/finished) 필터, stale 방 정리

## 비기능 요구사항

- NFR-1: admin API 라우트는 모두 서버 사이드에서 role 검증 (클라이언트 우회 불가)
- NFR-2: 게임 설정 fetch 실패 시 하드코딩 기본값 fallback (게임 작동 보장)
- NFR-3: 관리자 페이지는 기존 레트로 테마와 동일한 디자인 시스템 사용

## Acceptance Criteria

- [ ] `profiles` 테이블에 `role` 컬럼이 존재하고 기본값은 `'user'`
- [ ] 일반 유저가 `/admin` 접근 시 `/`로 리다이렉트됨
- [ ] 관리자가 `/admin`에서 유저 목록을 조회할 수 있음
- [ ] 관리자가 유저 역할을 변경할 수 있음
- [ ] 관리자가 점수 기록을 삭제할 수 있음
- [ ] 관리자가 게임 난이도를 DB에서 수정할 수 있음
- [ ] 게임 설정 변경 후 새 게임 시작 시 변경된 설정이 적용됨
- [ ] DB 설정 fetch 실패 시 하드코딩 기본값으로 게임이 정상 작동함
- [ ] lint, test, build 모두 통과
