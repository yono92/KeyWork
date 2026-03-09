import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ClientFetchError, fetchWithClientTimeout } from "../../src/lib/clientFetch";

describe("clientFetch", () => {
    beforeEach(() => {
        vi.useFakeTimers();
        vi.restoreAllMocks();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("returns response before timeout", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }))
        );

        const response = await fetchWithClientTimeout("/api/test", {}, 100);

        expect(response.status).toBe(200);
    });

    it("throws timeout error when request stays pending", async () => {
        vi.stubGlobal(
            "fetch",
            vi.fn((_input, init?: RequestInit) =>
                new Promise((_resolve, reject) => {
                    init?.signal?.addEventListener("abort", () => {
                        reject(new DOMException("timeout", "AbortError"));
                    });
                })
            )
        );

        const pending = expect(
            fetchWithClientTimeout("/api/test", {}, 50)
        ).rejects.toMatchObject<ClientFetchError>({
            code: "TIMEOUT",
        });
        await vi.advanceTimersByTimeAsync(60);

        await pending;
    });
});
