import Link from "next/link";
import { Gamepad2, Keyboard, Link2 } from "lucide-react";
import AppFrame from "../src/components/AppFrame";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const MODES = [
    { href: "/practice", label: "문장연습", icon: Keyboard, desc: "정확도와 속도를 같이 올리는 기본 모드" },
    { href: "/word-chain", label: "끝말잇기", icon: Link2, desc: "AI와 번갈아 단어를 이어가는 어휘 모드" },
    { href: "/tetris", label: "테트리스", icon: Gamepad2, desc: "모바일 조작도 가능한 가벼운 블록 퍼즐 모드" },
] as const;

export default function HomePage() {
    return (
        <AppFrame>
            <div className="mx-auto flex w-full max-w-[1200px] flex-1 flex-col gap-4 px-2 py-2 sm:px-4 sm:py-4 md:px-8 md:py-6">
                <Card className="bg-[var(--retro-surface)]">
                    <CardContent className="flex flex-col gap-4 px-5 py-6 sm:px-8 sm:py-8">
                        <div className="space-y-2">
                            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--retro-text)]">
                                KEYWORK.EXE
                            </p>
                            <h1 className="text-2xl font-bold text-[var(--retro-text)] sm:text-3xl">
                                타이핑 게임 모드 선택
                            </h1>
                            <p className="text-sm text-[var(--retro-text)]/85 sm:text-base">
                                원하는 모드를 선택해서 바로 시작하세요.
                            </p>
                        </div>
                        <div>
                            <Button asChild>
                                <Link href="/practice">바로 시작</Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {MODES.map((mode) => {
                        const Icon = mode.icon;
                        return (
                            <Link key={mode.href} href={mode.href}>
                                <Card className="h-full bg-[var(--retro-surface)] hover:bg-[var(--retro-surface-alt)]">
                                    <CardContent className="space-y-2 px-4 py-4">
                                        <div className="flex items-center gap-2">
                                            <Icon className="h-4 w-4 text-[var(--retro-text)]" aria-hidden="true" />
                                            <h2 className="text-sm font-semibold text-[var(--retro-text)] sm:text-base">
                                                {mode.label}
                                            </h2>
                                        </div>
                                        <p className="text-xs text-[var(--retro-text)]/85 sm:text-sm">
                                            {mode.desc}
                                        </p>
                                    </CardContent>
                                </Card>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </AppFrame>
    );
}
