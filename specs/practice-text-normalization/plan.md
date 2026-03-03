# plan.md

## 구현 전략
- `sentenceUtils`에 `sanitizePracticeSentence`를 추가한다.
- `getRandomSentence/getRandomSentenceUnique`는 정규화된 값을 반환하도록 보강한다.
- `TypingInput`에서 위키 응답도 정규화 후 반영한다.
- 정규화 결과가 비는 경우 속담 폴백으로 대체한다.

## 영향 파일
- `src/utils/sentenceUtils.ts`
- `src/components/TypingInput.tsx`
- `tests/utils/sentenceUtils.test.ts`

## 리스크 및 완화
- 리스크: 과도한 정제로 문장이 짧아짐
- 완화: 공백 정리 후 빈 문자열이면 즉시 폴백
