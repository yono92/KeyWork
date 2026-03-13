# 업적/뱃지 시스템 — Spec

## 사용자 스토리

1. 게임 종료 후, 새로 달성한 업적이 있으면 축하 팝업이 표시된다.
2. 프로필 페이지에서 내가 해금한 업적 목록과 미해금 업적을 볼 수 있다.
3. 각 업적에는 아이콘, 이름, 설명, 해금 조건이 표시된다.
4. 해금된 업적 수가 프로필 요약에 표시된다.

## 기능 요구사항

### FR-1: 업적 정의

업적은 코드에 정적 정의 (achievements.ts). DB에는 유저별 해금 기록만 저장.

카테고리:
- **입문**: 첫 플레이, 첫 로그인 등
- **모드 마스터**: 각 모드별 기록 달성
- **기록 달성**: 점수/WPM/정확도 임계값
- **다작**: 플레이 횟수 누적
- **멀티플레이**: 승리, 연승 등

### FR-2: 업적 조건 검사

- 점수 제출 직후 클라이언트에서 검사
- game_scores 테이블 데이터 + 방금 제출한 점수 기반
- 이미 해금된 업적은 스킵
- 새로 해금된 업적은 user_achievements에 INSERT

### FR-3: 업적 해금 알림

- 게임 오버 모달에 새로 해금된 업적 표시
- GameOverModal의 기존 badge prop 활용
- 여러 업적 동시 해금 가능

### FR-4: 프로필 업적 섹션

- 해금된 업적: 아이콘 + 이름 + 해금 날짜
- 미해금 업적: 흐린 아이콘 + 조건 힌트
- 카테고리별 필터/그룹
- 해금 수 / 전체 수 표시

### FR-5: 데이터 모델

```
user_achievements 테이블:
  id BIGSERIAL PRIMARY KEY
  user_id UUID NOT NULL REFERENCES profiles(id)
  achievement_id TEXT NOT NULL  -- 코드 정의 ID
  unlocked_at TIMESTAMPTZ DEFAULT now()
  UNIQUE(user_id, achievement_id)
```

## Acceptance Criteria

- [ ] AC-1: 업적 정의 파일에 20개 이상의 업적 정의
- [ ] AC-2: 점수 제출 후 조건 충족 시 자동 해금
- [ ] AC-3: 게임 오버 시 새 업적 팝업 표시
- [ ] AC-4: 프로필에 해금/미해금 업적 그리드 표시
- [ ] AC-5: 중복 해금 방지 (UNIQUE 제약)
- [ ] AC-6: 비로그인 시 업적 검사 스킵
- [ ] AC-7: 레트로 테마 적용
