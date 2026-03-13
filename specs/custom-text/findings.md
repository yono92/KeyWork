# findings.md

## 2026-03-13 구현 점검

### 확인된 상태
1. `useCustomTexts`, `usePracticeText`, `TypingInput`, `CustomTextManager`까지 기능 코드는 이미 구현되어 있었다.
2. `tasks.md`는 전부 `대기`로 남아 있었고, `plan.md`, `findings.md`가 빠져 있어 SDD 문서가 완료 상태를 반영하지 못하고 있었다.
3. 커스텀 텍스트가 비어 있을 때 문장연습 화면에는 속담 폴백 이유가 직접 보이지 않았고, 저장/삭제 실패 시 관리자 패널에도 오류 피드백이 없었다.

### 반영 내용
1. `TypingInput`에 빈 커스텀 텍스트 상태 배너를 추가해 속담 폴백 사실과 다음 액션을 바로 보여 주도록 했다.
2. `CustomTextManager`에 저장/삭제 실패 메시지를 추가하고, `useCustomTexts`의 로컬 업데이트 값도 서버 저장 길이 제한과 일치하도록 정리했다.
3. `tests/components/custom-text.test.tsx`를 추가해 비로그인 탭 비활성, 빈 텍스트 폴백 안내, 저장 실패 메시지를 검증했다.
4. `specs/custom-text`에 `plan.md`, `findings.md`를 추가하고 `tasks.md` 상태를 실제 구현 기준으로 동기화했다.

### 검증 결과
- `npm run lint`: 통과
- `npm run test:run`: 통과
- `npm run build`: 통과
