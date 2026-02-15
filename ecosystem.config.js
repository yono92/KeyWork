module.exports = {
    apps: [
        {
            name: "keywork",
            script: "npm",
            args: "start",
            env: {
                PORT: 5173,
                NODE_ENV: "production",
            },
        },
    ],
};
