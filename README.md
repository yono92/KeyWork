# KeyWork - 타자 연습 웹 애플리케이션

**KeyWork**는 사용자가 한국어 및 영어 문구를 입력하여 타자 연습을 할 수 있는 웹 애플리케이션입니다. 이 애플리케이션은 랜덤으로 문구를 제공하고, 사용자의 타이핑 속도를 측정하여 WPM(Word Per Minute)으로 보여줍니다. 또한, 다크 모드와 라이트 모드를 지원하여 사용자에게 편리한 환경을 제공합니다.

## 기술 스택

-   **React**: 사용자 인터페이스 구축을 위한 JavaScript 라이브러리
-   **TypeScript**: JavaScript에 타입을 추가하여 코드 품질을 높이는 언어
-   **Vite**: 빠른 개발 환경을 위한 빌드 도구
-   **Zustand**: 상태 관리를 위한 경량 라이브러리
-   **Tailwind CSS**: 유틸리티 퍼스트 CSS 프레임워크

## 주요 기능

-   랜덤 문구 제공
-   입력한 내용에 대한 실시간 피드백
-   타이핑 속도(WPM) 측정
-   이전 문장 타이핑 속도 기록
-   평균 타이핑 속도 계산
-   다크 모드 및 라이트 모드 지원

## 설치 및 실행

1.  **프로젝트 클론 또는 생성**

    ```bash
    git clone https://github.com/yono92/KeyWork
    cd keywork
    ```

2.  **npm install**

    ```bash
    npm install
    ```

3.  **개발 서버 시작**

    ```bash
    npm run dev
    ```

## ESLint 구성 확장하기

프로덕션 애플리케이션을 개발하는 경우, 구성에서 타입 인식 lint 규칙을 활성화하는 것을 권장합니다:

최상위 parserOptions 속성을 다음과 같이 구성합니다:

```javascript
export default tseslint.config({
    languageOptions: {
        parserOptions: {
            project: ["./tsconfig.node.json", "./tsconfig.app.json"],
            tsconfigRootDir: import.meta.dirname,
        },
    },
});
```

## 기여

기여는 언제나 환영합니다! 문제를 발견하거나 기능 요청이 있으면 이슈를 열어주세요. Pull Request도 언제든지 환영합니다.
