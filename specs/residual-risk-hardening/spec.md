# spec.md

## 문제
기존 `findings.md`에 남아 있던 잔여 리스크 5개가 아직 코드 레벨에서 완전히 닫히지 않았다.

## 목표
1. 클라이언트 API 호출이 무한 대기에 가까운 상태로 남지 않도록 한다.
2. 끝말잇기 관련 lint 이슈를 재현 기준으로 정리한다.
3. 테트리스 중력 루프가 `setInterval` 기반 오차에 덜 흔들리도록 한다.
4. 단어 선택이 작은 데이터 풀에서도 덜 반복되도록 보강한다.
5. lint/test/build를 다시 통과시키고 근거를 문서화한다.

## 비목표
- 게임 규칙 자체 변경
- 외부 API 라우트 계약 변경
- 데이터 파일 대규모 교체

## 수용 기준
1. `usePracticeText`, `useKoreanWords`, `useWordChainGame`의 클라이언트 fetch가 공통 타임아웃 유틸을 사용한다.
2. 테트리스 중력 루프가 `requestAnimationFrame` + 누적 시간 기준으로 동작한다.
3. 랜덤 단어 선택이 최근 단어와의 유사도만 보는 단순 필터보다 한 단계 더 다양한 후보 선택을 수행한다.
4. `npm run lint`, `npm run test:run`, `npm run build`가 통과한다.
