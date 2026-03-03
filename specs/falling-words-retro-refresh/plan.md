# plan.md

## 구현 전략
- 기존 구조는 그대로 두고 Tailwind 클래스 조합만 조정한다.
- 레트로 테마 변수(`--retro-*`)를 적극 사용해 컬러/보더 일관성을 맞춘다.
- 과도한 변경을 피하기 위해 단일 컴포넌트(`FallingWordsGame`)에 국한한다.

## 영향 파일
- `src/components/FallingWordsGame.tsx`

## 리스크 및 완화
- 리스크: 가독성 저하
- 완화: 핵심 상태 텍스트(타겟 단어/점수)는 명도 대비 유지

## 테스트 전략
- 자동: lint/test/build
- 수동: `/falling-words`에서 HUD/단어/입력부/시작 오버레이 시각 점검
