"use client";

import { useEffect, useMemo, useState } from "react";
import { Database, Medal, Trophy } from "lucide-react";
import Header from "@/components/Header";
import { Card, CardContent } from "@/components/ui/card";
import { loadLocalScores } from "@/lib/localData";
import useTypingStore from "@/store/store";
import type { GameMode, LocalScore } from "@/types/domain";

const MODES: { id: GameMode; ko: string; en: string }[] = [
    { id: "practice", ko: "문장연습", en: "Practice" },
    { id: "falling-words", ko: "단어낙하", en: "Falling Words" },
    { id: "word-chain", ko: "끝말잇기", en: "Word Chain" },
    { id: "typing-runner", ko: "타이핑 러너", en: "Typing Runner" },
    { id: "tetris", ko: "테트리스", en: "Tetris" },
];

export default function LeaderboardPage() {
    const language = useTypingStore((state) => state.language);
    const retroTheme = useTypingStore((state) => state.retroTheme);
    const ko = language === "korean";
    const rounded = retroTheme === "mac-classic";
    const [mode, setMode] = useState<GameMode>("practice");
    const [scores, setScores] = useState<LocalScore[]>([]);

    useEffect(() => {
        setScores(loadLocalScores());
    }, []);

    const modeScores = useMemo(() => scores
        .filter((score) => score.game_mode === mode)
        .sort((left, right) => right.score - left.score)
        .slice(0, 20), [mode, scores]);
    const best = modeScores[0]?.score ?? 0;
    const shell = rounded ? "rounded-2xl" : "rounded-none";

    return (
        <div className="flex h-full flex-col overflow-hidden">
            <Header />
            <div className="flex-1 overflow-y-auto">
                <div className="mx-auto max-w-5xl space-y-4 p-3 sm:p-4">
                    <Card className={shell}>
                        <CardContent className="relative overflow-hidden p-5 sm:p-7">
                            <div className="absolute right-5 top-5 opacity-10" aria-hidden>
                                <Trophy className="h-28 w-28 text-[var(--retro-accent)]" />
                            </div>
                            <div className="relative max-w-2xl">
                                <p className="mb-2 text-xs font-black uppercase tracking-[0.18em] text-[var(--retro-accent)]">LOCAL RECORDS</p>
                                <h1 className="text-2xl font-black text-[var(--retro-text)] sm:text-3xl">{ko ? "이 브라우저의 최고 기록" : "Best scores on this browser"}</h1>
                                <p className="mt-2 text-sm text-[var(--retro-text)]/65">{ko ? "글로벌 순위가 아닌 현재 기기에 저장된 개인 기록입니다." : "These are personal records stored on this device, not a global ranking."}</p>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex gap-2 overflow-x-auto pb-1">
                        {MODES.map((item) => (
                            <button
                                key={item.id}
                                type="button"
                                onClick={() => setMode(item.id)}
                                className={`shrink-0 border-2 px-3 py-2 text-xs font-bold ${rounded ? "rounded-lg" : "rounded-none"} ${mode === item.id ? "border-[var(--retro-border-dark)] bg-[var(--retro-accent)] text-[var(--retro-text-inverse)]" : "border-[var(--retro-border-mid)] bg-[var(--retro-surface)] text-[var(--retro-text)] hover:bg-[var(--retro-surface-alt)]"}`}
                            >
                                {ko ? item.ko : item.en}
                            </button>
                        ))}
                    </div>

                    <div className="grid gap-4 lg:grid-cols-[240px_1fr]">
                        <Card className={shell}>
                            <CardContent className="p-5 text-center">
                                <Medal className="mx-auto h-9 w-9 text-amber-500" />
                                <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--retro-text)]/50">{ko ? "최고 점수" : "Best score"}</p>
                                <p className="mt-1 font-mono text-4xl font-black text-[var(--retro-accent)]">{best.toLocaleString()}</p>
                                <p className="mt-3 text-xs text-[var(--retro-text)]/50">{ko ? `저장된 플레이 ${modeScores.length}회` : `${modeScores.length} saved runs`}</p>
                            </CardContent>
                        </Card>

                        <Card className={shell}>
                            <CardContent className="p-0">
                                {modeScores.length === 0 ? (
                                    <div className="flex min-h-64 flex-col items-center justify-center gap-3 p-8 text-center">
                                        <Database className="h-8 w-8 text-[var(--retro-text)]/30" />
                                        <p className="text-sm font-bold text-[var(--retro-text)]">{ko ? "아직 저장된 기록이 없습니다" : "No saved scores yet"}</p>
                                        <p className="text-xs text-[var(--retro-text)]/50">{ko ? "게임을 완료하면 여기에 기록됩니다." : "Finish a game and its score will appear here."}</p>
                                    </div>
                                ) : (
                                    <ol className="divide-y divide-[var(--retro-border-mid)]">
                                        {modeScores.map((score, index) => (
                                            <li key={score.id} className="grid grid-cols-[44px_1fr_auto] items-center gap-3 px-4 py-3">
                                                <span className="font-mono text-sm font-black text-[var(--retro-text)]/45">#{index + 1}</span>
                                                <div>
                                                    <p className="font-mono text-lg font-black text-[var(--retro-text)]">{score.score.toLocaleString()}</p>
                                                    <p className="text-[11px] text-[var(--retro-text)]/45">{new Date(score.created_at).toLocaleString(ko ? "ko-KR" : "en-US")}</p>
                                                </div>
                                                <div className="text-right text-[11px] text-[var(--retro-text)]/55">
                                                    {score.wpm != null && <p>{score.wpm} WPM</p>}
                                                    {score.accuracy != null && <p>{score.accuracy}%</p>}
                                                </div>
                                            </li>
                                        ))}
                                    </ol>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
