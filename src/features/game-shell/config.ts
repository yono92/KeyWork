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
}

export const NAV_ITEMS: readonly NavItem[] = [
    {
        id: "practice",
        icon: "keyboard",
        label: { korean: "문장연습", english: "Practice" },
        shortLabel: { korean: "연습", english: "Practice" },
    },
    {
        id: "falling-words",
        icon: "rain",
        label: { korean: "단어낙하", english: "Falling Words" },
        shortLabel: { korean: "낙하", english: "Falling" },
    },
    {
        id: "word-chain",
        icon: "chain",
        label: { korean: "끝말잇기", english: "Word Chain" },
        shortLabel: { korean: "끝말잇기", english: "Chain" },
    },
    {
        id: "typing-runner",
        icon: "runner",
        label: { korean: "타이핑 러너", english: "Typing Runner" },
        shortLabel: { korean: "러너", english: "Runner" },
    },
    {
        id: "tetris",
        icon: "keyboard",
        label: { korean: "테트리스", english: "Tetris" },
        shortLabel: { korean: "테트리스", english: "Tetris" },
    },
];

export const PAGE_TITLES: Record<AppLanguage, Record<string, string>> = {
    korean: Object.fromEntries(NAV_ITEMS.map((item) => [`/${item.id}`, item.label.korean])),
    english: Object.fromEntries(NAV_ITEMS.map((item) => [`/${item.id}`, item.label.english])),
};

export const getPageTitle = (language: AppLanguage, pathname: string): string =>
    PAGE_TITLES[language][pathname] ?? PAGE_TITLES[language]["/practice"];

export const getModeByPathname = (pathname: string): NavItem =>
    NAV_ITEMS.find((item) => pathname === `/${item.id}`) ?? NAV_ITEMS[0];
