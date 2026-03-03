# findings.md

## 2026-03-03 단어낙하 콤보/반응형 보정

### 변경
1. `score` 아이템의 콤보 증가값을 +1로 조정함.
2. 단어 길이에 따른 반응형 폰트 분기(`getWordSizeClass`) 추가.
3. HUD/점수팝업/입력창 폰트를 모바일~데스크톱 기준으로 확대.

### 검증 결과
- `npm run lint`: 통과 (에러 0, 기존 경고 1건 유지: `src/components/WordChainGame.tsx:249`)
- `npm run test:run`: 통과 (12 files, 42 tests)
- `npm run build`: 통과
