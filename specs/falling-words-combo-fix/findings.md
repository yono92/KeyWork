# findings.md

## 2026-03-12 조사 메모

### 확인된 상태
1. `FallingWordsGame`의 `handleSubmit`은 현재 렌더 시점의 `words` 상태를 바로 읽고, 이후 `setWords`와 `setCombo`를 호출한다.
2. `setCombo` updater 안에서 점수 증가, 레벨업, 콤보 사운드, 글로우, 점수 팝업까지 같이 처리하고 있다.
3. 같은 단어를 같은 입력 흐름에서 두 번 처리하는 방어 로직이 없어, submit 중복 시 콤보/점수가 같이 튈 가능성이 있다.

### 구현 방향
- 단어 성공 처리 시 같은 `word.id`를 한 번만 claim하도록 잠금 장치를 둔다.
- 콤보 계산과 부수효과를 분리해 updater 재호출에도 결과가 불안정해지지 않게 만든다.

## 2026-03-12 구현 메모

### 반영 내용
1. `src/lib/fallingWords.ts`에 `findClaimableFallingWord`, `calculateFallingWordsMatchScore`를 분리해 중복 claim 방지와 콤보 점수 계산을 순수 함수로 정리했다.
2. `FallingWordsGame`에 `claimedWordIdsRef`를 추가해 같은 단어가 같은 입력 흐름에서 두 번 처리되지 않게 막았다.
3. `comboRef`를 추가하고, 기존 `setCombo` updater 안에 있던 점수 계산/레벨업/콤보 사운드/글로우/팝업 부수효과를 updater 밖으로 이동했다.
4. 단어 제거 타이머와 재시작 시점에 claim 잠금을 정리해 다음 단어 처리와 충돌하지 않게 했다.
5. `tests/lib/fallingWords.test.ts`를 추가해 중복 claim 방지와 콤보 점수 계산 규칙을 회귀 테스트로 고정했다.

### 검증 결과
- `npm run lint`: 통과
- `npm run test:run`: 통과 (17 files, 73 tests)
- `npm run build`: 통과
