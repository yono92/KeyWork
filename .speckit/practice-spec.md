# 문장연습 (Practice) — 현행 스펙

## 개요

한국어/영어 문장을 보고 따라 타이핑하여 속도(WPM/KPM)와 정확도를 측정하는 핵심 연습 모드.

## 유저 스토리

### [P1] US-01: 속담/명언 타이핑 연습
> 사용자로서, 속담/명언 문장을 보고 따라 치면서 타이핑 속도와 정확도를 실시간으로 확인하고 싶다.

**Acceptance Criteria:**
- Given 연습 페이지 진입 시
- When 속담/명언 탭이 기본 선택되어 있으면
- Then 랜덤 문장이 표시되고, 타이핑 시작 시 WPM/KPM과 정확도가 실시간 갱신된다

### [P1] US-02: 커스텀 텍스트 연습
> 로그인 사용자로서, 나만의 연습 텍스트를 등록하고 해당 텍스트로 타이핑 연습을 하고 싶다.

**Acceptance Criteria:**
- Given 로그인 상태에서 "My Texts" 탭 선택 시
- When 커스텀 텍스트가 등록되어 있으면
- Then 해당 텍스트로 연습할 수 있고, CRUD(추가/수정/삭제) 관리가 가능하다

### [P1] US-03: 세션 통계 확인
> 사용자로서, 현재 문장과 전체 세션의 평균 속도/정확도를 한눈에 보고 싶다.

**Acceptance Criteria:**
- Given 문장 타이핑 중일 때
- When 4개 통계 패널을 확인하면
- Then 현재 속도, 현재 정확도, 평균 속도, 평균 정확도가 표시된다

## 기능 요구사항

### FR-001: 텍스트 소스
- 속담/명언 탭: `src/data/proverbs.json` (한국어 145개, 영어 129개)
- 커스텀 텍스트 탭: Supabase DB에서 사용자별 텍스트 로드 (로그인 필요)
- 언어 설정에 따라 한/영 텍스트 자동 전환

### FR-002: 타이핑 입력 및 비교
- 글자 단위 실시간 비교 (초록=정확, 빨강=오타, 파란 밑줄=현재 위치)
- 한글: 자모 분해(`hangulUtils.ts`) 기반 정확도 계산
- 영어: 문자 수준 비교
- Enter 키로 문장 완료 → 다음 문장 자동 진행
- 줄바꿈은 공백으로 치환

### FR-003: 속도 계산
- **영어 WPM**: (정확 문자 수 / 5) / (경과 시간(분)), 12초 미만 세션 캡 적용
- **한국어 KPM**: 타/분 단위 측정
- 가중 평균 + 이상치 필터링으로 세션 평균 산출

### FR-004: 정확도 계산
- 한글: 자모 위치별 가중치(초성/중성/종성) 적용
- 영어: 글자 일치 비율

### FR-005: UI 구성
- 소스 선택 탭 (속담/명언 | My Texts)
- 목표 문장 표시 영역 (진행 상황 색상 표시)
- textarea 입력 필드 (레트로 블록 커서)
- 진행 바 (문장 완료 비율)
- 4-stat 대시보드 (현재 속도, 현재 정확도, 평균 속도, 평균 정확도)
- 온스크린 키보드 표시 (비모바일, `Keyboard.tsx`)

### FR-006: 키보드 시각화
- 한/영 키보드 레이아웃 표시
- 자모-QWERTY 매핑 (`Keyboard.tsx`)
- 현재 눌린 키 하이라이트

## 관련 파일

| 파일 | 역할 |
|------|------|
| `src/components/TypingInput.tsx` | 메인 게임 컴포넌트 |
| `src/components/Keyboard.tsx` | 온스크린 키보드 |
| `src/components/CustomTextManager.tsx` | 커스텀 텍스트 CRUD |
| `src/hooks/usePracticeText.ts` | 텍스트 로드 훅 |
| `src/hooks/useCustomTexts.ts` | 커스텀 텍스트 CRUD 훅 |
| `src/utils/hangulUtils.ts` | 한글 자모 분해/비교 |
| `src/utils/levenshtein.ts` | 자모 레벤슈타인 정확도 |
| `src/data/proverbs.json` | 속담/명언 데이터 |
| `app/(game)/practice/page.tsx` | 라우트 페이지 |
