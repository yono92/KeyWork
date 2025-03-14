module.exports = {
    apps: [
        {
            name: "keywork",
            script: "serve",
            args: "-s dist -l 5173", // dist는 빌드 폴더명, 3000은 포트
            env: {
                PM2_SERVE_PATH: "./dist", // 빌드 폴더 경로
                PM2_SERVE_PORT: 5173,
                PM2_SERVE_SPA: "true", // SPA 모드 활성화
                PM2_SERVE_HOMEPAGE: "/index.html",
            },
        },
    ],
};
