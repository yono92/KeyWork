# Specs Workspace Guide

이 디렉터리는 KeyWork의 스펙 기반 개발(SDD: Spec-Driven Development) 작업 공간이다.

## 기본 원칙
1. 모든 기능 작업은 `specs/[feature-name]/`에서 시작한다.
2. 구현 전 반드시 `README.md -> spec.md -> plan.md` 순서로 합의 가능한 문서를 만든다.
3. 실제 구현 작업은 `tasks.md` 기준으로만 진행한다.
4. `progress.md`는 독립 작성 금지, `tasks.md` 상태를 그대로 미러링한다.
5. 구현 중 기술 의사결정/이슈/학습은 `findings.md`에 누적 기록한다.

## 활성 스펙

현재 활성 스펙 없음. 모든 기존 스펙 완료됨.

## 완료된 스펙 (33개)

### 핵심 기능
- `multiplayer-supabase`: Supabase 인증, 리더보드, 멀티플레이어 대전
- `online-ready-room`: 멀티플레이어 레디룸
- `public-room-lobby`: 공개 방 로비
- `supabase-online-reliability`: Supabase 온라인 안정성 강화
- `auth-session-stability`: 인증 세션 안정성
- `auth-multiplayer-consistency`: 인증-멀티플레이어 일관성

### 게임 모드
- `dictation`: 받아쓰기 모드
- `typing-defense`: 타이핑 디펜스 모드
- `mobile-tetris-lite`: 모바일 경량 테트리스

### 유저 시스템
- `achievements`: 업적/배지 시스템 (25개)
- `custom-text`: 커스텀 연습 텍스트
- `daily-missions-streak`: 데일리 미션 & 스트릭
- `friends`: 친구 시스템
- `friend-challenge-rematch`: 친구 챌린지 & 리매치
- `user-stats`: 유저 통계
- `xp-level-progression`: XP/레벨 진행
- `weekly-season-leaderboard`: 주간/시즌 리더보드
- `global-level-visibility`: 글로벌 레벨 표시
- `pixel-avatar-customization`: 픽셀 아바타 커스터마이징
- `profile-editor-refresh`: 프로필 에디터 리뉴얼
- `practice-local-corpus`: 로컬 코퍼스 전환

### 게임 개선 & 버그 수정
- `game-reliability-hardening`: 외부 API 폴백 UX
- `residual-risk-hardening`: 잔존 리스크 보강
- `falling-words-combo-fix`: 단어낙하 콤보 수정
- `falling-words-combo-responsive`: 단어낙하 콤보/반응형
- `falling-words-retro-refresh`: 단어낙하 레트로 스타일
- `word-chain-validation-ux`: 끝말잇기 검증 UX
- `word-random-diversity`: 랜덤 단어 다양성
- `word-prefix-avoidance`: 단어 접두사 반복 회피
- `practice-text-normalization`: 연습 문장 정규화
- `practice-prompt-rotation`: 문장 텍스트 순환
- `link-preview-fix`: Open Graph 프리뷰 안정화

## 표준 절차
1. `specs/[feature-name]/README.md` 작성
- 기능 배경, 목적, 범위/제외 범위, 성공 기준 요약

2. `spec.md` 작성 (Outside-in)
- 사용자 스토리
- 기능/비기능 요구사항
- Acceptance Criteria

3. `plan.md` 작성
- 아키텍처/데이터 흐름
- 영향 파일
- 리스크 및 완화 전략
- 테스트 전략

4. `tasks.md` 작성
- 구현 가능한 단위 작업으로 분해
- 완료 조건(테스트/빌드/수동검증) 명시

5. 구현 및 추적
- 코드 변경은 항상 특정 task ID에 연결
- task 상태 변경 시 `progress.md` 즉시 동기화
- 기술적 이슈는 `findings.md`에 날짜와 함께 기록

## 상태 규칙
- 상태 값: `대기`, `진행중`, `완료`, `차단`
- 한 시점에 `진행중` task는 1개만 허용

## Definition of Done
1. `tasks.md`의 해당 작업이 완료로 표시됨
2. `progress.md`가 동일 상태로 미러링됨
3. `findings.md`에 변경 근거/리스크/결정사항이 기록됨
4. 아래 검증 통과
- `npm run lint`
- `npm run test:run`
- `npm run build`

## 네이밍 규칙
- feature 폴더명은 소문자 kebab-case 사용
- 예: `specs/game-reliability-hardening/`
