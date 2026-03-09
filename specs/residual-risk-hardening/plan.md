# plan.md

## 구현 계획
1. 클라이언트 공통 fetch 유틸을 추가하고 practice/falling-words/word-chain 호출부에 적용한다.
2. 단어 다양성 유틸을 분리해 `useKoreanWords`, `useWordChainGame`에서 공용 사용한다.
3. 테트리스 중력 루프를 `requestAnimationFrame` 기반 누적 시간 처리로 교체한다.
4. lint/test/build를 실행하고 결과 및 잔여 리스크를 문서에 반영한다.
