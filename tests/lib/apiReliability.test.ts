import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    ApiRequestError,
    fetchWithTimeoutRetry,
    pruneCache,
} from "../../src/lib/apiReliability";

describe("apiReliability", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it("retries and returns response on second attempt", async () => {
        const fetchMock = vi
            .fn()
            .mockRejectedValueOnce(new Error("temporary"))
            .mockResolvedValueOnce(new Response("ok", { status: 200 }));

        vi.stubGlobal("fetch", fetchMock);

        const response = await fetchWithTimeoutRetry(
            "https://example.com",
            { cache: "no-store" },
            { timeoutMs: 100, retries: 1, retryDelayMs: 1 }
        );

        expect(response.status).toBe(200);
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it("throws timeout error code for abort", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn().mockRejectedValue(new DOMException("timeout", "AbortError"))
        );

        await expect(
            fetchWithTimeoutRetry(
                "https://example.com",
                { cache: "no-store" },
                { timeoutMs: 1, retries: 0 }
            )
        ).rejects.toMatchObject<ApiRequestError>({
            code: "TIMEOUT",
            status: 504,
        });
    });

    it("prunes expired entries and enforces max size", () => {
        const now = Date.now();
        const cache = new Map<string, { value: number; expiresAt: number }>([
            ["a", { value: 1, expiresAt: now - 1 }],
            ["b", { value: 2, expiresAt: now + 1000 }],
            ["c", { value: 3, expiresAt: now + 1000 }],
            ["d", { value: 4, expiresAt: now + 1000 }],
        ]);

        pruneCache(cache, 2);

        expect(cache.has("a")).toBe(false);
        expect(cache.size).toBe(2);
    });
});
