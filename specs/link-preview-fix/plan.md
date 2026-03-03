# plan.md

## 구현 전략
- `src/utils/siteUrl.ts`로 URL 계산을 공통화한다.
- `app/layout.tsx`, `app/sitemap.ts`, `app/robots.ts`에서 공통 함수를 사용한다.
- `app/opengraph-image.tsx`, `app/twitter-image.tsx`를 추가한다.

## 영향 파일
- `src/utils/siteUrl.ts`
- `app/layout.tsx`
- `app/sitemap.ts`
- `app/robots.ts`
- `app/opengraph-image.tsx`
- `app/twitter-image.tsx`
