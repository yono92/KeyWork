# KeyWork

KeyWork???쒓?/?곷Ц ????곗뒿怨?誘몃땲 寃뚯엫???쒓났?섎뒗 ???깆엯?덈떎.
?꾩옱 ?꾨줈?앺듃??Next.js App Router 湲곕컲?쇰줈 ?숈옉?⑸땲??

- Production: https://key-work-rho.vercel.app
- Canonical URL: `https://key-work-rho.vercel.app`
- Legacy `https://key-work.vercel.app` is not assigned to this project
- 湲곕낯 吏꾩엯 寃쎈줈: `/practice`

## Tech Stack

- Next.js 15 (App Router)
- React 18 + TypeScript
- Zustand (global state)
- Tailwind CSS
- Vitest + Testing Library

## Routes

- `/practice`
- `/falling-words`
- `/typing-defense`
- `/typing-race`
- `/dictation`
- `/word-chain`

## Getting Started

```bash
git clone https://github.com/yono92/KeyWork
cd KeyWork
npm install
npm run dev
```

媛쒕컻 ?쒕쾭: `http://localhost:3000`

## Scripts

- `npm run dev`: 媛쒕컻 ?쒕쾭 ?ㅽ뻾
- `npm run build`: ?꾨줈?뺤뀡 鍮뚮뱶
- `npm run build:prod`: `NODE_ENV=production` 鍮뚮뱶
- `npm run start`: 鍮뚮뱶 寃곌낵 ?ㅽ뻾
- `npm run preview`: 鍮뚮뱶 寃곌낵 ?ㅽ뻾 (`start`? ?숈씪)
- `npm run lint`: ESLint ?ㅽ뻾
- `npm run test`: Vitest watch 紐⑤뱶
- `npm run test:run`: Vitest ?⑥씪 ?ㅽ뻾

## Validation Checklist

PR ?꾩뿉 ?꾨옒瑜?沅뚯옣?⑸땲??

```bash
npm run lint
npm run build
npm run test:run
```

## Project Structure

- `app/`: Next.js App Router ?뷀듃由?諛??쇱슦??- `src/components/`: 寃뚯엫 諛?怨듯넻 UI 而댄룷?뚰듃
- `src/store/store.ts`: Zustand ?꾩뿭 ?곹깭
- `src/utils/hangulUtils.ts`: ?쒓? ??댄븨 泥섎━ ?좏떥
- `src/utils/levenshtein.ts`: ?뺥솗??嫄곕━ 怨꾩궛 ?좏떥
- `src/data/*.json`: ?쒓?/?곷Ц 臾몄옣 ?곗씠??- `tests/setup.ts`: ?뚯뒪???고????뗭뾽

## Deployment (Vercel)

???꾨줈?앺듃??Vercel?먯꽌 諛고룷?⑸땲??

?꾩닔 ?ㅼ젙:
- Framework Preset: `Next.js`
- Root Directory: `.`
- Build Command: `npm run build`
- Output Directory: 鍮꾩썙?먭린 (Next.js 湲곕낯媛??ъ슜)
- Node.js Version: `20.x`

## License

MIT

