# Supabase 제거 완료 체크리스트

- [x] Supabase SDK import가 없다.
- [x] Supabase 환경변수 참조가 없다.
- [x] Supabase 클라이언트/미들웨어/Admin API가 없다.
- [x] 로그인·로그아웃·회원가입 UI가 없다.
- [x] 친구·초대·온라인 방·battle 라우트가 없다.
- [x] `/admin` 및 `/api/admin` 라우트가 없다.
- [x] 프로필·아바타·업적·계정 통계 기능과 `/profile` 라우트가 없다.
- [x] 커스텀 문장과 개인 점수가 로컬에 저장된다.
- [x] `/leaderboard`가 로컬 기록임을 명확히 표시한다.
- [x] localStorage 접근에 브라우저 가드가 있다.
- [x] 한글/영문 기본 타이핑 기능 회귀가 없다.
- [x] `npm run lint`가 통과한다.
- [x] `npm run test:run`이 통과한다.
- [x] `npm run build`가 통과한다.

## 검증 시나리오

- [x] 빌드 라우트 목록에서 `/profile`, `/battle`, `/admin`이 생성되지 않는다.
- [x] 계정 없이 한국어/영어 커스텀 문장 소스를 선택할 수 있다.
- [x] 손상되거나 쓰기가 차단된 localStorage에서도 기본값으로 동작한다.
