# findings.md

## 2026-03-03 FallingWords 레트로 리프레시

### 반영 사항
1. 게임 컨테이너/상단 HUD/하단 입력 패널을 레트로 보더/팔레트로 통일함.
2. 화면에 스캔라인 느낌의 얕은 오버레이를 추가해 CRT 감성을 강화함.
3. 단어/점수 표기에 `font-mono`와 하드 섀도우를 적용해 픽셀 감도를 높임.
4. 시작 오버레이를 레트로 패널 스타일로 전환함.

### 검증 결과
- `npm run lint`: 통과 (에러 0, 기존 경고 1건 유지: `src/components/WordChainGame.tsx:249`)
- `npm run test:run`: 통과 (12 files, 40 tests)
- `npm run build`: 통과
