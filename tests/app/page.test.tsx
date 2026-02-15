import HomePage from "../../app/page";

describe("app/page", () => {
    it("redirects to /practice", () => {
        expect(() => HomePage()).toThrowError("NEXT_REDIRECT:/practice");
    });
});
