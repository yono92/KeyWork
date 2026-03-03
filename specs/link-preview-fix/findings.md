# findings.md

## 2026-03-03 링크 프리뷰 메타 수정

### 변경
1. 배포 도메인 하드코딩 제거 및 환경변수 기반 URL 계산 적용.
2. Open Graph/Twitter 이미지 생성 라우트 추가(1200x630).
3. sitemap/robots URL 기준 통일.

### 검증 결과
- `npm run lint`: 통과
- `npm run test:run`: 통과 (12 files, 42 tests)
- `npm run build`: 통과 (`/opengraph-image`, `/twitter-image` 정적 라우트 생성 확인)
