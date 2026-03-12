# findings.md

## 2026-03-12 조사 메모

### 확인된 원인
1. `src/hooks/useAuth.ts`는 예외 시 `setState({ user: session.user, profile: null, loading: false })`를 수행해 로그인 여부와 프로필 존재 여부가 분리된다.
2. `app/(game)/profile/page.tsx`는 `!isLoggedIn || !profile`이면 로그인 필요 화면을 표시한다.
3. `src/components/SideNav.tsx`는 `isLoggedIn`만으로 계정 영역을 로그인 상태처럼 렌더링하고 `profile`이 없으면 `"Player"`를 보여준다.
4. `public.rooms`의 `rooms_update` 정책은 `auth.uid() = player1_id OR auth.uid() = player2_id`만 허용해, 아직 `player2_id`가 비어 있는 방에는 새 참가자가 들어갈 수 없다.

### 구현 메모
- 인증 UI 기준은 `user`와 `profile`이 함께 준비됐을 때만 로그인으로 간주하도록 맞춘다.
- 방 참가 정책은 대기 중 방에 한해 새 사용자가 `player2_id`로 들어올 수 있도록 조정한다.

## 2026-03-12 수정 완료

### T2: useAuth 상태 일관성
- `useAuth.ts` line 82-85: catch 블록에서 `clearAuthState()` 호출로 변경
- 이전: `setState({ user: session.user, profile: null, loading: false })` → user/profile 불일치
- 이후: `clearAuthState()` → 완전 로그아웃 (user=null, profile=null)
- 테스트 업데이트: `tests/hooks/useAuth.test.tsx` "does not report logged-in UI state when profile hydration fails"

### T3: rooms RLS 정책
- Supabase 마이그레이션 `fix_rooms_update_rls_for_join` 적용
- USING 절: `auth.uid() = player1_id OR auth.uid() = player2_id OR (status = 'waiting' AND player2_id IS NULL)`
- WITH CHECK 절: `auth.uid() = player1_id OR auth.uid() = player2_id` (업데이트 후 player2_id = auth.uid()이므로 통과)

### T4: 검증
- `npm run lint` ✅
- `npx vitest run` ✅ (70/70 tests)
- `npm run build` ✅
