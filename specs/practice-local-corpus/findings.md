# findings.md

## 2026-03-11 문장연습 로컬 코퍼스 전환

### 결정
1. 문장연습 런타임은 외부 API를 호출하지 않고 로컬 데이터셋만 사용한다.
2. 외부 사전/공공데이터는 배치 수집 스크립트에서만 사용한다.
3. 우리말샘은 `type1=proverb` 검색을 사용하고, 공공데이터 파일은 추가 병합 소스로 취급한다.

### 리스크
- 우리말샘 검색 쿼리 설계에 따라 수집 커버리지가 달라질 수 있다.

### 검증 결과
1. `node scripts/sync-practice-corpus.mjs --help`: 통과
2. `npm run lint`: 통과 (기존 경고 4건 유지, `src/hooks/useMultiplayerRoom.ts`)
3. `npm run test:run`: 통과 (15 files, 57 tests)
4. `npm run build`: 통과 (Next.js 15 production build)
