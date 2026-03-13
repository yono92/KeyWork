# 받아쓰기 (Dictation)

## 배경

KeyWork 6개 게임 모드 중 마지막 미구현 모드. CLAUDE.md에 명시, Supabase `game_scores` 타입에 `dictation` 이미 정의.

## 목적

TTS(Web Speech API)로 문장을 들려주고, 사용자가 듣고 타이핑하는 받아쓰기 게임.
청각 기반 타이핑 연습으로 기존 시각 기반 모드와 차별화.

## 범위

- Web Speech API (`speechSynthesis`) 기반 TTS 재생
- 속담 데이터(proverbs.json) 활용
- 자모 단위 정확도 계산 (hangulUtils 재사용)
- 10문제 1세트, 총점 + 정확도 표시
- 난이도: 재생 속도/반복 횟수 차등
- 리더보드 연동
- 한/영 지원

## 제외 범위

- 음성 인식(STT) — 타이핑으로만 입력
- 외부 TTS API — 브라우저 내장만 사용
- 멀티플레이어
