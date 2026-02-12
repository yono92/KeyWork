import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    esbuild: {
        drop: ["console", "debugger"],
        legalComments: "none",
    },
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
        minify: "esbuild",
        // 청크 크기 경고 임계값 설정
        chunkSizeWarningLimit: 1000,
    },
});
