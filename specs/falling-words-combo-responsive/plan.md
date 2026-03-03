# plan.md

## 구현 전략
- 콤보 증분 상수(기존 +2)를 +1로 변경한다.
- `getWordSizeClass` 헬퍼로 단어 길이에 따른 폰트 클래스를 분기한다.
- 컨테이너 최소 높이 및 HUD/입력 폰트 클래스만 조정한다.

## 영향 파일
- `src/components/FallingWordsGame.tsx`
