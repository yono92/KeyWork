# KeyWork 버그 수정 및 코드 최적화 리포트

## 수정 일자: 2026-02-10

---

## Critical Bugs (수정 완료)

### 1. FallingWordsGame - clear 아이템 필터 로직 반전
- **파일**: `src/components/FallingWordsGame.tsx:163`
- **문제**: `curr.filter((w) => w.type === "normal")` — normal 단어만 남기고 특수 아이템을 삭제함 (의도와 반대)
- **수정**: `w.type !== "normal"` 으로 변경하여 normal 단어를 제거하고 특수 아이템은 유지
- **영향도**: 게임 플레이에 직접 영향 — clear 아이템 사용 시 화면의 일반 단어가 사라지지 않고 특수 아이템이 사라지는 치명적 버그

### 2. TypingInput - 중복 모바일 감지 useEffect
- **파일**: `src/components/TypingInput.tsx:297-314`
- **문제**: 두 개의 useEffect가 각각 resize와 userAgent로 모바일 감지. userAgent 체크가 항상 resize 결과를 덮어씌움
- **수정**: 하나의 useEffect로 통합 (`window.innerWidth <= 768 || userAgent 체크`)
- **영향도**: 데스크톱에서 창 크기를 줄여도 키보드가 숨겨지지 않는 UI 버그

### 3. TypingInput - AudioContext 초기화 useEffect 재실행
- **파일**: `src/components/TypingInput.tsx:213-254`
- **문제**: dependency에 `audioInitialized`가 포함되어 있어 effect 내에서 상태 변경 시 재실행. 재실행 시 `setText(initialRandomQuote)`가 다시 호출되어 타이핑 중 텍스트 리셋
- **수정**: 텍스트 초기화와 AudioContext 초기화를 별도 useEffect로 분리. 텍스트 초기화는 마운트 시 1회만 실행
- **영향도**: 타이핑 도중 텍스트가 갑자기 바뀌는 심각한 UX 버그

### 4. FallingWordsGame - restartGame 타이머 정리 누락
- **파일**: `src/components/FallingWordsGame.tsx:290-305`
- **문제**: `restartGame()`에서 `activeTimersRef.current`의 타이머를 정리하지 않음
- **수정**: `Object.values(activeTimersRef.current).forEach(clearTimeout)` 추가
- **영향도**: 게임 재시작 후 이전 slow/shield 효과 타이머가 계속 실행되어 예기치 않은 상태 변경

---

## High - 메모리 누수 & 성능 (수정 완료)

### 5. TypingInput - AudioContext 중복 생성
- **파일**: `src/components/TypingInput.tsx:146-211`
- **문제**: `beep()` 내 `audioContext` state가 null일 때 새로 생성 → 빠른 연속 호출 시 여러 AudioContext 생성 가능
- **수정**: `useState` → `useRef`로 변경하여 동기적 참조. 중복 생성 불가능
- **영향도**: 브라우저 AudioContext 리소스 누수 방지

### 6. TypingInput - renderText() 메모이제이션
- **파일**: `src/components/TypingInput.tsx:486-504`
- **문제**: 매 렌더링마다 `text.split("").map()`으로 모든 span 재생성
- **수정**: `useMemo`로 감싸서 `text`와 `input`이 변경될 때만 재계산
- **영향도**: 불필요한 DOM 재생성 방지, 렌더링 성능 향상

### 7. Levenshtein - O(m*n) 공간 사용
- **파일**: `src/utils/levenshtein.ts`
- **문제**: 전체 2D 매트릭스 생성 (O(m*n) 공간)
- **수정**: 2행 rolling array 방식으로 O(min(m,n)) 공간 최적화 + 빈 배열 조기 반환
- **영향도**: 매 키 입력마다 호출되므로 GC 부담 감소

### 8. Keyboard - useMemo에 빈 dependency
- **파일**: `src/components/Keyboard.tsx:14-148`
- **문제**: 빈 dependency array의 useMemo는 상수 데이터와 동일
- **수정**: 모듈 레벨 상수(`ENGLISH_LAYOUT`, `KOREAN_LAYOUT`)로 추출, useMemo 제거
- **영향도**: 코드 명확성 향상, 불필요한 Hook 호출 제거

---

## Medium - 코드 품질 (수정 완료)

### 9. TypingInput - text가 빈 문자열일 때 division by zero
- **파일**: `src/components/TypingInput.tsx:258`
- **문제**: `(input.length / text.length) * 100` — text.length가 0이면 Infinity
- **수정**: `text.length > 0 ? ... : 0` 방어 코드 추가

### 10. FallingWordsGame - lives가 0 미만일 때 emoji.repeat() 에러
- **파일**: `src/components/FallingWordsGame.tsx:344`
- **문제**: `"❤️".repeat(lives)` — lives < 0이면 RangeError
- **수정**: `Math.max(lives, 0)` 방어 코드 추가

### 11. MainLayout - 중복 darkMode 클래스 적용
- **파일**: `src/components/MainLayout.tsx:26` + `src/App.tsx:14`
- **문제**: App.tsx와 MainLayout.tsx 모두 `darkMode ? "dark" : ""` 적용 → 중복
- **수정**: MainLayout.tsx에서 darkMode 클래스 제거 (App.tsx에서 처리)

### 12. 불필요한 console.log 제거
- **파일**: `TypingInput.tsx`, `FallingWordsGame.tsx`
- **문제**: 디버그용 console.log/error가 프로덕션 코드에 잔존
- **수정**: 불필요한 console 문 제거, catch 블록 빈 처리로 변경
