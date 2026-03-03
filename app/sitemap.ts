import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/utils/siteUrl";

const BASE_URL = getSiteUrl();

export default function sitemap(): MetadataRoute.Sitemap {
    const routes = [
        "/practice",
        "/falling-words",
        "/word-chain",
        "/typing-runner",
        "/tetris",
    ];

    return routes.map((route) => ({
        url: `${BASE_URL}${route}`,
        lastModified: new Date(),
        changeFrequency: "monthly",
        priority: route === "/practice" ? 1.0 : 0.8,
    }));
}
