import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

declare global {
    var __TEST_PATHNAME__: string | undefined;
}

if (!window.matchMedia) {
    Object.defineProperty(window, "matchMedia", {
        writable: true,
        value: (query: string) => ({
            matches: false,
            media: query,
            onchange: null,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            addListener: vi.fn(),
            removeListener: vi.fn(),
            dispatchEvent: vi.fn(),
        }),
    });
}

class AudioContextMock {
    currentTime = 0;
    state: "running" | "suspended" = "running";
    destination = {};

    createOscillator() {
        return {
            type: "sine",
            frequency: {
                setValueAtTime: vi.fn(),
                linearRampToValueAtTime: vi.fn(),
            },
            connect: vi.fn().mockReturnThis(),
            start: vi.fn(),
            stop: vi.fn(),
        };
    }

    createGain() {
        return {
            gain: {
                setValueAtTime: vi.fn(),
                linearRampToValueAtTime: vi.fn(),
            },
            connect: vi.fn().mockReturnThis(),
        };
    }

    resume = vi.fn();
}

Object.defineProperty(window, "AudioContext", {
    writable: true,
    value: AudioContextMock,
});

Object.defineProperty(window, "webkitAudioContext", {
    writable: true,
    value: AudioContextMock,
});

Object.defineProperty(window, "confirm", {
    writable: true,
    value: vi.fn(() => false),
});

Object.defineProperty(globalThis, "speechSynthesis", {
    writable: true,
    value: {
        getVoices: vi.fn(() => []),
        speak: vi.fn(),
        cancel: vi.fn(),
        pause: vi.fn(),
        resume: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        onvoiceschanged: null,
    },
});

Object.defineProperty(globalThis, "SpeechSynthesisUtterance", {
    writable: true,
    value: class {
        text = "";
        lang = "ko-KR";
        rate = 1;
        pitch = 1;
        volume = 1;
        onend: (() => void) | null = null;
        onerror: (() => void) | null = null;
        constructor(text: string) {
            this.text = text;
        }
    },
});

vi.mock("next/navigation", () => {
    const push = vi.fn();
    return {
        usePathname: () => globalThis.__TEST_PATHNAME__ ?? "/practice",
        useRouter: () => ({ push }),
        redirect: (href: string) => {
            throw new Error(`NEXT_REDIRECT:${href}`);
        },
        __mockPush: push,
    };
});
