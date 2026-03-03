# findings.md

## 2026-03-03 한글/영문 문장 정규화

### 결정
1. 한글 모드는 `가-힣`, 숫자, 공백, 기본 문장부호만 허용한다.
2. 영어 모드는 `A-Za-z`, 숫자, 공백, 기본 문장부호만 허용한다.
3. 정규화 후 공백은 단일 공백으로 축약한다.

### 허용 문장부호
- `.,!?"'():;-`

### 예상 효과
- 한글 모드 영어 혼입 제거
- 키보드 처리 난이도 높은 기호/이모지 제거

### 검증 결과
- `npm run lint`: 통과 (에러 0, 기존 경고 1건 유지: `src/components/WordChainGame.tsx:249`)
- `npm run test:run`: 통과 (12 files, 38 tests)
- `npm run build`: 통과 (Next.js 15.5.12 production build)
