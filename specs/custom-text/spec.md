# 커스텀 텍스트 모드 — Spec

## 사용자 스토리

1. 로그인한 유저가 문장연습 화면에서 "내 텍스트" 탭을 선택하면, 등록한 커스텀 텍스트로 연습한다.
2. 유저가 커스텀 텍스트를 추가/수정/삭제할 수 있는 관리 UI가 있다.
3. 커스텀 텍스트가 없을 때 안내 메시지와 등록 유도가 표시된다.
4. 비로그인 유저는 "속담" 소스만 사용 가능 (기존 동작).

## 기능 요구사항

### FR-1: custom_texts 테이블

```
custom_texts:
  id BIGSERIAL PRIMARY KEY
  user_id UUID NOT NULL REFERENCES profiles(id)
  title TEXT NOT NULL (최대 50자)
  content TEXT NOT NULL (최대 2000자)
  language TEXT NOT NULL ('korean' | 'english')
  created_at TIMESTAMPTZ DEFAULT now()
  updated_at TIMESTAMPTZ DEFAULT now()
```

### FR-2: 텍스트 소스 전환

- 문장연습 화면 상단에 소스 탭: "속담" / "내 텍스트"
- "내 텍스트" 선택 시 커스텀 텍스트에서 랜덤 로드
- 선택 상태 localStorage 저장 (practiceSource)
- 비로그인 시 "내 텍스트" 탭 비활성

### FR-3: 커스텀 텍스트 관리

- 문장연습 화면의 "내 텍스트" 탭에서 관리 버튼 → 모달/패널
- 등록: 제목 + 내용 입력
- 수정: 기존 텍스트 편집
- 삭제: 확인 후 삭제
- 목록: 제목, 미리보기, 날짜

### FR-4: 텍스트 로딩

- 커스텀 텍스트도 extractPracticePrompts()로 분할
- 현재 언어와 일치하는 텍스트만 사용
- 커스텀 텍스트가 없으면 안내 + 속담 폴백

## Acceptance Criteria

- [ ] AC-1: 커스텀 텍스트 CRUD 동작
- [ ] AC-2: 문장연습에서 소스 전환 동작
- [ ] AC-3: 커스텀 텍스트로 타이핑 연습 가능
- [ ] AC-4: 비로그인 시 속담만 사용
- [ ] AC-5: 레트로 테마 적용
- [ ] AC-6: lint, build 통과
