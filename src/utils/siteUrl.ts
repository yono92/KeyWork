const ensureHttps = (value: string): string => {
    const trimmed = value.trim();
    if (!trimmed) return "";
    if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
    return `https://${trimmed}`;
};

export const getSiteUrl = (): string => {
    const fromEnv =
        process.env.NEXT_PUBLIC_SITE_URL ||
        process.env.VERCEL_PROJECT_PRODUCTION_URL ||
        process.env.VERCEL_URL;

    const normalized = fromEnv ? ensureHttps(fromEnv) : "";
    if (normalized) return normalized;

    // Local/dev fallback
    return "http://localhost:3000";
};

