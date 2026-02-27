# Specs Workspace Guide

이 디렉터리는 KeyWork의 스펙 기반 개발(SDD: Spec-Driven Development) 작업 공간이다.

## 기본 원칙
1. 모든 기능 작업은 `specs/[feature-name]/`에서 시작한다.
2. 구현 전 반드시 `README.md -> spec.md -> plan.md` 순서로 합의 가능한 문서를 만든다.
3. 실제 구현 작업은 `tasks.md` 기준으로만 진행한다.
4. `progress.md`는 독립 작성 금지, `tasks.md` 상태를 그대로 미러링한다.
5. 구현 중 기술 의사결정/이슈/학습은 `findings.md`에 누적 기록한다.

## 활성 스펙
- `game-reliability-hardening`: 외부 API 실패 대비 및 폴백 UX 통일
- `mobile-tetris-lite`: 모바일 경량 테트리스 모드 추가

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
