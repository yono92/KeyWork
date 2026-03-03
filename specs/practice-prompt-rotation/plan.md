# plan.md

## 구현 전략
- `sentenceUtils`에 `extractPracticePrompts`를 추가한다.
- `TypingInput`에 `promptQueueRef`를 두고, 현재 프롬프트 소진 시 큐에서 pop한다.
- 큐가 비었을 때만 `fetchPracticeText`를 호출한다.

## 영향 파일
- `src/utils/sentenceUtils.ts`
- `src/components/TypingInput.tsx`
- `tests/utils/sentenceUtils.test.ts`

## 리스크 및 완화
- 리스크: 분할 문장이 너무 짧아질 수 있음
- 완화: 최소 길이 기준과 마지막 조각 허용 정책 병행
