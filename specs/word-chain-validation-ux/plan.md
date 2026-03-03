# plan.md

## 구현 전략
- `WordChainGame`에서 `handlePass` 및 버튼 렌더링 제거.
- `krdict/validate` API의 `pos` 파라미터 제거.

## 영향 파일
- `src/components/WordChainGame.tsx`
- `app/api/krdict/validate/route.ts`
