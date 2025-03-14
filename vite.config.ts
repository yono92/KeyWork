import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    server: {
        hmr: {
            overlay: false, // 에러 오버레이 비활성화
        },
    },
    // 프로덕션 빌드 설정 추가
    build: {
        // 소스맵 비활성화
        sourcemap: false,
        // 최적화 설정
        minify: "terser",
        terserOptions: {
            compress: {
                drop_console: true, // 콘솔 로그 제거
                drop_debugger: true, // 디버거 구문 제거
            },
            format: {
                comments: false, // 주석 제거
            },
            // 파일 경로 정보 제거
            mangle: {
                properties: {
                    regex: /^_/,
                },
            },
        },
        // 청크 크기 경고 임계값 설정
        chunkSizeWarningLimit: 1000,
    },
});
