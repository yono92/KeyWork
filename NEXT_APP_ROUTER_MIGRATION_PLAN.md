# Next.js App Router Migration Plan (KeyWork)

## 0. Goal and Scope
- Goal: Migrate current Vite + React SPA to Next.js with **App Router**.
- Routing policy: Use `app/` directory routing only. Do not use Pages Router (`pages/`).
- Functional goal: Keep current user-visible behavior the same first, then optimize.
- Non-goal (phase 1): Large game logic refactor or major UI redesign.

## 1. Current State Snapshot
- Entry and routing:
  - `src/main.tsx` uses `BrowserRouter`
  - `src/App.tsx` uses `Routes`, `Route`, `Navigate`
  - `src/components/SideNav.tsx`, `src/components/Header.tsx` depend on `react-router-dom`
- Global state:
  - `src/store/store.ts` initializes from `localStorage` at module init time
- Browser-only API usage:
  - Multiple components use `window`, `document`, `AudioContext`
- Build/runtime:
  - Vite scripts and config (`vite.config.ts`, `vite-env.d.ts`)

## 2. Migration Strategy (App Router)
1. Build a minimal Next app shell first.
2. Port routes with App Router segments.
3. Mark client boundaries (`"use client"`) and isolate browser-only code.
4. Remove `react-router-dom` dependency and route hooks usage.
5. Keep Zustand store, but make localStorage access safe for SSR.
6. Validate feature parity and production build.

## 3. Phased Plan

### Phase 1 - Bootstrap Next App Router
- Add Next.js dependencies and scripts.
- Create `app/layout.tsx`, `app/page.tsx`, `app/globals.css`.
- Keep existing `src/` code for incremental migration.
- Add `next.config.*` and align TypeScript config for Next.
- Acceptance:
  - `npm run dev` starts Next app.
  - `/` renders successfully via App Router.

### Phase 2 - Route Mapping (App Router only)
- Create route segments:
  - `app/practice/page.tsx`
  - `app/falling-words/page.tsx`
  - `app/typing-defense/page.tsx`
  - `app/typing-race/page.tsx`
  - `app/dictation/page.tsx`
  - `app/word-chain/page.tsx`
- Replace SPA redirect logic with Next navigation (`redirect` on `/` if needed).
- Acceptance:
  - All 6 routes open directly by URL refresh without SPA fallback config.

### Phase 3 - Router Dependency Removal
- Replace `react-router-dom` usage:
  - `useLocation` -> `usePathname` (`next/navigation`)
  - `useNavigate` -> `useRouter().push`
- Remove `BrowserRouter`, `Routes`, `Route`, `Navigate` code paths.
- Remove `react-router-dom` package after code replacement.
- Acceptance:
  - No import from `react-router-dom`.
  - Navigation, active menu highlight, title rendering unchanged.

### Phase 4 - SSR/Client Boundary Hardening
- Add `"use client"` for interactive components and Zustand consumers as needed.
- Update Zustand store init:
  - Avoid direct `localStorage` access at module top-level.
  - Gate storage reads/writes to client-safe paths.
- Verify browser-only APIs:
  - `window`, `document`, `AudioContext`, `matchMedia` are client-only.
- Acceptance:
  - No server-side runtime errors (`window is not defined`, etc.).
  - Hydration warnings are resolved.

### Phase 5 - Assets, Styles, and Build Cleanup
- Migrate global styles to Next entry (`app/globals.css`).
- Validate static assets in `public/`.
- Remove Vite-specific files when fully migrated:
  - `vite.config.ts`, `src/main.tsx`, `src/vite-env.d.ts`, Vite scripts.
- Keep Tailwind/PostCSS config and adapt if needed.
- Acceptance:
  - `npm run build` succeeds with Next.
  - `npm run start` serves production build correctly.

### Phase 6 - Parity Verification
- Manual parity checks per mode:
  - Practice, Falling Words, Typing Defense, Typing Race, Dictation, Word Chain
- Critical checks:
  - Korean/English typing behavior and accuracy logic
  - Audio init behavior after user gesture
  - Theme/language persistence
  - Mobile side menu behavior
- Acceptance:
  - No functional regression in core flows.

## 4. Risk Register
- High risk: SSR boundary bugs from `localStorage` and browser APIs.
- High risk: Route-state coupling assumptions from old SPA structure.
- Medium risk: Tailwind/global CSS load order differences.
- Medium risk: Build/deploy config mismatch (`vercel.json`, PM2 assumptions).

## 5. Execution Order for This Repo
1. Phase 1 bootstrap files + script switch.
2. Phase 2 route segment creation.
3. Phase 3 `react-router-dom` removal.
4. Phase 4 SSR/client fixes in store and interactive components.
5. Phase 5 cleanup of Vite files.
6. Phase 6 parity verification and final stabilization.

## 6. Definition of Done
- App runs and builds on Next.js App Router.
- All existing routes are available as App Router segments.
- No dependency on `react-router-dom`.
- No server/runtime hydration errors.
- Core game features behave equivalently to current implementation.
