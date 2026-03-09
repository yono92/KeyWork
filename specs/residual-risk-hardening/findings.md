# findings.md

## 2026-03-09 초기 메모

### 대상
1. 클라이언트 fetch 타임아웃 미적용
2. 끝말잇기 lint 경고 재확인 필요
3. 테트리스 `setInterval` 기반 루프 오차
4. 작은 데이터 풀에서 단어 반복 가능성

### 구현 메모
- 클라이언트 fetch는 공통 유틸로 묶어 practice/falling-words/word-chain에 동일 정책을 적용한다.
- 단어 다양성은 최근 이력 기반 점수화로 공통 유틸을 분리한다.
- 테트리스는 `requestAnimationFrame` 누적 델타 방식으로 교체한다.

## 2026-03-09 구현 완료

### 반영 내용
1. `src/lib/clientFetch.ts` 추가
- 클라이언트 공통 타임아웃 fetch 유틸과 `ClientFetchError` 도입
- `usePracticeText`, `useKoreanWords`, `useWordChainGame`에 동일 정책 적용

2. `src/utils/wordDiversity.ts` 추가
- 최근 단어 이력 기반 유사도 판정과 점수화 선택 로직 분리
- `useKoreanWords`, `useWordChainGame`가 동일 정책을 공유하도록 정리

3. 테트리스 중력 루프 개선
- `src/hooks/useTetrisEngine.ts`의 `setInterval` 중력을 `requestAnimationFrame` 누적 델타 처리로 교체
- 탭 복귀/프레임 드랍 구간에서 과도한 속도 흔들림을 줄이도록 상한 델타를 적용

4. 끝말잇기 lint 재점검
- 현 시점 `npm run lint`에서 기존 `WordChainGame.tsx` 경고는 재현되지 않음
- 대신 끝말잇기 관련 변경분은 lint/test/build 재통과로 정리

### 수동 검증 시나리오
1. `/practice`에서 네트워크를 지연시키거나 API 실패를 유도했을 때 속담 폴백 배너가 노출되는지 확인
2. `/falling-words` 한국어 모드에서 사전 응답이 늦거나 실패해도 로컬 단어로 계속 진행되는지 확인
3. `/word-chain`에서 사전 응답 지연 시 로컬 후보/검증으로 전환되는지 확인
4. `/tetris`에서 백그라운드 전환 후 복귀했을 때 블록 낙하가 과도하게 튀지 않는지 확인

### 검증 결과
- `npm run lint`: 통과
- `npm run test:run`: 통과 (14 files, 46 tests)
- `npm run build`: 통과

### 잔여 리스크
1. 클라이언트 fetch 타임아웃은 공통 적용했지만, 사용자별 네트워크 품질에 따라 최적 timeout 값은 추가 조정이 필요할 수 있음
2. 단어 다양성은 문자열 패턴 기준이므로 의미/발음 유사도까지는 여전히 다루지 않음
