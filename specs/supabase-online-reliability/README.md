# supabase-online-reliability

Supabase 인증과 온라인 대전 흐름에서 실제 플레이를 깨뜨리는 결함을 우선 수정하는 작업이다.

## 범위
- 회원가입 직후 프로필 누락으로 인증 상태가 꼬이는 문제 보정
- 멀티플레이 채널이 전투 시작 후에도 유지되도록 구조 조정
- self-broadcast, 선공 결정, 방 나가기/유령 방 문제 수정
- 회귀 테스트, Supabase 정책 마이그레이션, lint/test/build 검증
