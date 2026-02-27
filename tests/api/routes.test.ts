import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET as candidatesGet } from "../../app/api/krdict/candidates/route";
import { GET as validateGet } from "../../app/api/krdict/validate/route";
import { GET as wikipediaGet } from "../../app/api/wikipedia/route";

describe("api routes error contract", () => {
    beforeEach(() => {
        vi.restoreAllMocks();
    });

    it("returns BAD_REQUEST when candidates starts is missing", async () => {
        const req = new NextRequest("http://localhost/api/krdict/candidates");
        const res = await candidatesGet(req);
        const data = await res.json();

        expect(res.status).toBe(400);
        expect(data.errorCode).toBe("BAD_REQUEST");
        expect(data.source).toBe("krdict");
    });

    it("returns BAD_REQUEST when validate word is missing", async () => {
        const req = new NextRequest("http://localhost/api/krdict/validate");
        const res = await validateGet(req);
        const data = await res.json();

        expect(res.status).toBe(400);
        expect(data.errorCode).toBe("BAD_REQUEST");
        expect(data.source).toBe("krdict");
    });

    it("returns NETWORK error when wikipedia upstream fails", async () => {
        vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));

        const req = new NextRequest("http://localhost/api/wikipedia?lang=ko");
        const res = await wikipediaGet(req);
        const data = await res.json();

        expect(res.status).toBe(502);
        expect(data.errorCode).toBe("NETWORK");
        expect(data.source).toBe("wikipedia");
    });
});
