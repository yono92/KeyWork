import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/utils/siteUrl";

export default function robots(): MetadataRoute.Robots {
    const base = getSiteUrl();
    return {
        rules: {
            userAgent: "*",
            allow: "/",
            disallow: "/api/",
        },
        sitemap: `${base}/sitemap.xml`,
    };
}
