import useTypingStore from "../../src/store/store";

describe("useTypingStore", () => {
    beforeEach(() => {
        localStorage.clear();
        useTypingStore.setState({
            darkMode: false,
            progress: 0,
            text: "Start typing practice.",
            gameMode: "practice",
            language: "korean",
            isMuted: false,
            highScore: 0,
            difficulty: "normal",
            mobileMenuOpen: false,
        });
    });

    it("toggles dark mode", () => {
        useTypingStore.getState().toggleDarkMode();
        expect(useTypingStore.getState().darkMode).toBe(true);
    });

    it("toggles language", () => {
        useTypingStore.getState().toggleLanguage();
        expect(useTypingStore.getState().language).toBe("english");
    });

    it("sets progress/text", () => {
        useTypingStore.getState().setProgress(55);
        useTypingStore.getState().setText("abc");
        expect(useTypingStore.getState().progress).toBe(55);
        expect(useTypingStore.getState().text).toBe("abc");
    });
});
