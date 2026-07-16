export type AppLanguage = "korean" | "english";

export type GameMode =
    | "practice"
    | "falling-words"
    | "typing-runner"
    | "word-chain"
    | "tetris";

export interface NavItem {
    id: GameMode;
    icon: "keyboard" | "rain" | "runner" | "chain";
    label: Record<AppLanguage, string>;
    shortLabel: Record<AppLanguage, string>;
    accent: string;
}

export const NAV_ITEMS: readonly NavItem[] = [
    {
        id: "practice",
        icon: "keyboard",
        label: { korean: "문장연습", english: "Practice" },
        shortLabel: { korean: "연습", english: "Practice" },
        accent: "#4a9eff",
    },
    {
        id: "falling-words",
        icon: "rain",
        label: { korean: "단어낙하", english: "Falling Words" },
        shortLabel: { korean: "낙하", english: "Falling" },
        accent: "#ff6b35",
    },
    {
        id: "word-chain",
        icon: "chain",
        label: { korean: "끝말잇기", english: "Word Chain" },
        shortLabel: { korean: "끝말잇기", english: "Chain" },
        accent: "#22d3ee",
    },
    {
        id: "typing-runner",
        icon: "runner",
        label: { korean: "타이핑 러너", english: "Typing Runner" },
        shortLabel: { korean: "러너", english: "Runner" },
        accent: "#a855f7",
    },
    {
        id: "tetris",
        icon: "keyboard",
        label: { korean: "테트리스", english: "Tetris" },
        shortLabel: { korean: "테트리스", english: "Tetris" },
        accent: "#facc15",
    },
];

export const PAGE_TITLES: Record<AppLanguage, Record<string, string>> = {
    korean: {
        ...Object.fromEntries(NAV_ITEMS.map((item) => [`/${item.id}`, item.label.korean])),
        "/leaderboard": "내 기록",
    },
    english: {
        ...Object.fromEntries(NAV_ITEMS.map((item) => [`/${item.id}`, item.label.english])),
        "/leaderboard": "My Records",
    },
};

export const getPageTitle = (language: AppLanguage, pathname: string): string =>
    PAGE_TITLES[language][pathname] ?? PAGE_TITLES[language]["/practice"];

export const getModeByPathname = (pathname: string): NavItem =>
    NAV_ITEMS.find((item) => pathname === `/${item.id}`) ?? NAV_ITEMS[0];
