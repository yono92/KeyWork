# findings.md

## 2026-03-13 구현 메모

### 결정
1. 전역 레벨 노출은 별도 상태를 만들지 않고 기존 `useUserStats`를 재사용한다.
2. 작은 공간에서는 `LevelBadge compact`를 사용해 정보량을 유지하면서 계정 UI를 과도하게 키우지 않는다.

### 반영 내용
1. `UserMenu` 버튼에 `LV.n`을 추가하고, 드롭다운 상단에 컴팩트 레벨 배지를 노출했다.
2. `SideNav` 계정 섹션에 로그인 유저의 레벨 배지를 추가했다.
3. 로그인 상태에서 레벨 UI 노출을 검증하도록 컴포넌트 테스트를 보강했다.

### 검증 결과
- `npm run lint`: 통과
- `npm run test:run`: 통과
- `npm run build`: 통과
