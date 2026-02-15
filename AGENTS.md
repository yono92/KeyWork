# AGENTS.md

This file is the project-specific guide for agents working in this repository.

## 1) Project Summary
- App type: Korean/English typing practice plus mini-game web app
- Stack: React 18 + TypeScript + Vite 5
- State: Zustand (`src/store/store.ts`)
- Styling: Tailwind CSS with root `dark` class
- Routing: React Router with `BrowserRouter`

## 2) Commands
- Dev server: `npm run dev`
- Build: `npm run build`
- Production build: `npm run build:prod`
- Lint: `npm run lint`
- Preview: `npm run preview`

Notes:
- No unit/integration test framework is configured.
- For validation, run `npm run lint` and `npm run build` by default.

## 3) Core Structure
- Entry point: `src/main.tsx`
- Routes: `src/App.tsx`
  - `/practice`
  - `/falling-words`
  - `/typing-defense`
  - `/typing-race`
  - `/dictation`
  - `/word-chain`
- Shared layout: `src/components/MainLayout.tsx`
- Global store: `src/store/store.ts`
  - Persisted keys include `darkMode`, `language`, `highScore`, `difficulty`
  - Current mode is tracked by `gameMode`

## 4) Domain Rules (Important)
- For Korean typing accuracy/keystroke logic, use `src/utils/hangulUtils.ts`.
- If Korean comparison logic changes, keep consistency with `src/utils/levenshtein.ts`.
- Typing-related features must work for both languages and use `src/data/*.json`.

## 5) Implementation Principles
- Follow existing patterns:
  - Keep UI in Tailwind utility style
  - Keep global state in Zustand patterns used in this repo
  - If adding routes, update both `src/App.tsx` and `src/components/MainLayout.tsx`
- Prefer small, scoped changes over broad refactors.
- Keep type safety high; avoid `any` unless absolutely necessary.
- Guard browser-only APIs (`window`, `AudioContext`) as existing components do.
  - See `src/components/TypingInput.tsx` and `src/components/FallingWordsGame.tsx`.

## 6) Cautions
- File naming issue:
  - `src/hooks/useMediaQuery .ts` contains a space before `.ts`.
  - Be careful with imports and renames.
- Encoding:
  - Some docs/comments may display Korean text incorrectly in some terminals.
  - Keep file encoding in UTF-8.
- Dependency cleanup:
  - Verify real import usage before removing packages.

## 7) Completion Checklist
1. Only intended files are changed.
2. Lint passes: `npm run lint`
3. Build passes: `npm run build`
4. Route/store changes are reflected in all related files.
5. No Korean/English typing regression, especially in accuracy logic.

## 8) Recommended Commit Scope
- One feature or one bug fix per commit.
- Preferred prefixes:
  - `feat: ...`
  - `fix: ...`
  - `refactor: ...`
  - `chore: ...`
