# README.md

## 기능 배경
- 타이핑 러너/단어 낙하에서 시작 음절이 비슷한 단어가 연속 출제되어 체감 난이도와 재미가 떨어지는 문제가 있었다.

## 목적
- 랜덤 단어 선택 시 최근 출제 단어와의 유사도를 제한해 출제 다양성을 높인다.

## 범위
- `TypingRunnerGame`, `FallingWordsGame`, `useKoreanWords`의 단어 선택 로직

## 제외 범위
- 끝말잇기(`WordChainGame`) AI 단어 선택 최적화
- 문장 연습(`TypingInput`, `sentenceUtils`) 랜덤 정책 변경

## 성공 기준
- 한국어 단어에서 직전/최근 단어와 시작부가 겹치는 연속 출제 빈도가 감소한다.
- 기존 게임 진행(스폰/입력/점수/레벨업)은 유지된다.
- lint/test/build가 모두 통과한다.
