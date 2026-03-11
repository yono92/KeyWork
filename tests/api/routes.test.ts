import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET as candidatesGet } from "../../app/api/krdict/candidates/route";
import { GET as validateGet } from "../../app/api/krdict/validate/route";

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
});
