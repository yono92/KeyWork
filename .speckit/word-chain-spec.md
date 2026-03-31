# 끝말잇기 (Word Chain) — 현행 스펙

## 개요

AI 상대와 턴제 끝말잇기 대전. krdict API + 로컬 사전으로 단어 검증하며, 타이머와 라이프 시스템으로 긴장감을 유지한다.

## 유저 스토리

### [P1] US-01: AI 끝말잇기 대전
> 사용자로서, AI와 번갈아 단어를 이으며 끝말잇기를 하고 싶다.

**Acceptance Criteria:**
- Given 게임 시작 시
- When 사용자가 단어를 입력하면
- Then AI가 마지막 글자로 시작하는 단어를 응답하고, 턴이 교대된다

### [P1] US-02: 단어 검증
> 사용자로서, 입력한 단어가 사전에 있는 유효한 단어인지 즉시 확인받고 싶다.

**Acceptance Criteria:**
- Given 단어 입력 후 제출 시
- When krdict API (또는 로컬 사전 폴백)로 검증하면
- Then 유효 단어는 정의와 함께 표시, 무효 단어는 취소선+흔들림으로 표시된다

## 기능 요구사항

### FR-001: 턴 시스템
- 사용자와 AI가 교대로 단어 입력
- 다음 단어는 이전 단어의 마지막 글자로 시작해야 함
- 두음법칙 처리 (`dueumUtils.ts`: ㄹ→ㄴ, ㄴ→탈락 등)
- 이미 사용된 단어 재사용 불가

### FR-002: 타이머 (난이도별)
| 난이도 | 제한 시간 |
|--------|----------|
| Easy | 20초 |
| Normal | 15초 |
| Hard | 10초 |
- 잔여 3초 이하: 빨간색 펄스 + 화면 인셋 섀도우
- API 검증 중(`isValidatingWord`)과 AI 차례(`isAiTurn`) 동안 타이머 일시정지

### FR-003: 점수 계산
```
점수 = 단어길이 × 10 × 시간보너스 × 콤보배율
- 시간보너스 = 잔여시간 / 제한시간
- 콤보배율 = min(1 + combo × 0.2, 2.0)
- 검증 실패 시 콤보 리셋
```

### FR-004: 라이프 시스템
- 시작 라이프: 3
- 라이프 감소 조건: 무효 단어, 타이머 만료
- 라이프 0 = 게임 오버

### FR-005: 승리 조건
- AI가 유효 단어를 찾지 못하면 사용자 승리
- "YOU WIN!" 모달 표시

### FR-006: 단어 검증 시스템
- 1차: krdict API (`/api/krdict/validate`, 명사만, 1시간 캐시)
- 2차: 로컬 사전 폴백 (`src/data/wordchain-dict.json`, 한 1281개, 영 1309개)
- AI 후보 조회: `/api/krdict/candidates` (10분 캐시)
- API 실패 시 재시도 알림 표시

### FR-007: UI 구성
- 상단 바 (점수, 콤보, 타이머, 라이프, 타이머 진행 바)
- 현재 필요 글자 힌트 표시
- 채팅 영역 (사용자: 우측 파랑, AI: 좌측, 말풍선 슬라이드 인)
- AI 사고 중 인디케이터 ("AI THINKING" + 애니메이션)
- 단어 정의 표시 (유효 단어 하단)
- 하단 입력 필드 + 제출 버튼

## 관련 파일

| 파일 | 역할 |
|------|------|
| `src/components/WordChainGame.tsx` | 메인 게임 컴포넌트 |
| `src/hooks/useWordChainGame.ts` | 게임 로직 훅 |
| `src/utils/dueumUtils.ts` | 두음법칙 처리 |
| `src/data/wordchain-dict.json` | 로컬 단어 사전 |
| `app/api/krdict/validate/route.ts` | 단어 검증 API |
| `app/api/krdict/candidates/route.ts` | 후보 단어 API |
| `app/(game)/word-chain/page.tsx` | 라우트 페이지 |
