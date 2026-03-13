# 받아쓰기 — Technical Plan

## 아키텍처

### 신규 파일

| 파일 | 역할 |
|------|------|
| `src/components/DictationGame.tsx` | 메인 게임 컴포넌트 |
| `src/hooks/useDictationEngine.ts` | 게임 로직 (문제 관리, 채점, TTS) |
| `app/(game)/dictation/page.tsx` | 라우트 페이지 |

### 수정 파일

| 파일 | 변경 |
|------|------|
| `src/features/game-shell/config.ts` | GameMode에 `dictation` 추가, NAV_ITEMS 항목 |
| `src/components/MainLayout.tsx` | dynamic import 추가 |
| `src/components/navigation/NavMenu.tsx` | VISIBLE_MENU_ITEMS 업데이트 |
| `src/components/Header.tsx` | 아이콘 맵 업데이트 |

### 재사용 (수정 없음)

| 파일 | 용도 |
|------|------|
| `DifficultySelector.tsx` | 난이도 선택 |
| `GameOverModal.tsx` | 결과 모달 |
| `GameInput.tsx` | 한/영 IME 입력 |
| `useGameAudio.ts` | 효과음 |
| `useScoreSubmit.ts` | 리더보드 제출 |
| `sentenceUtils.ts` | getRandomSentenceUnique |
| `hangulUtils.ts` | calculateHangulAccuracy |

## 핵심 설계

### TTS 관리

```typescript
function speak(text: string, lang: "korean" | "english", rate: number): Promise<void> {
    return new Promise((resolve) => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang === "korean" ? "ko-KR" : "en-US";
        utterance.rate = rate;
        utterance.onend = () => resolve();
        speechSynthesis.speak(utterance);
    });
}
```

### 채점 로직

```typescript
// 한국어: 자모 단위
const accuracy = calculateHangulAccuracy(target, input);

// 영어: 문자 단위 레벤슈타인
const accuracy = calculateCharAccuracy(target, input);

// 글자별 diff
const diff = diffChars(target, input); // [{char, status: "correct"|"incorrect"|"missing"}]
```

### 게임 흐름

```
난이도 선택 → 문제 1 TTS 재생 → 타이핑 → Enter 제출 → 채점 표시
→ "다음" 클릭 → 문제 2 TTS 재생 → ... → 문제 10 → 결과 화면
```

### UI 레이아웃

```
┌─────────────────────────────────────────┐
│  문제 3/10  │  현재 점수: 270          │  ← 진행 바
├─────────────────────────────────────────┤
│                                          │
│         🔊  다시 듣기 (2회 남음)         │  ← 재생 버튼
│                                          │
│  ┌──────────────────────────────────┐   │
│  │  [타이핑 입력창]           Enter │   │  ← 입력
│  └──────────────────────────────────┘   │
│                                          │
│  채점 결과:                              │  ← 제출 후 표시
│  "까마귀 떡 감추듯"                      │
│   ○ ○ ○ ○ × ○ ○ ○                      │
│  정확도: 87%                             │
│                                          │
│              [다음 문제 →]               │
└─────────────────────────────────────────┘
```

## 리스크

| 리스크 | 대응 |
|--------|------|
| TTS 미지원 브라우저 | 폴백: 문장을 2초간 표시 후 숨김 |
| 한국어 TTS 음성 없음 | 시스템 기본 음성 사용, 없으면 폴백 |
| TTS 속도가 브라우저마다 다름 | rate 값만 조절, 절대 시간 의존 안 함 |
