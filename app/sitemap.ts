import type { MetadataRoute } from "next";

const BASE_URL = "https://key-work-rho.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
    const routes = [
        "/practice",
        "/falling-words",
        "/word-chain",
        "/typing-race",
        "/typing-defense",
        "/dictation",
    ];

    return routes.map((route) => ({
        url: `${BASE_URL}${route}`,
        lastModified: new Date(),
        changeFrequency: "monthly",
        priority: route === "/practice" ? 1.0 : 0.8,
    }));
}
