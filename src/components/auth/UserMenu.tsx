"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "./AuthProvider";
import { Button } from "@/components/ui/button";
import useTypingStore from "@/store/store";
import { User, LogOut, Trophy } from "lucide-react";

export default function UserMenu() {
    const { profile, signOut } = useAuthContext();
    const language = useTypingStore((s) => s.language);
    const retroTheme = useTypingStore((s) => s.retroTheme);
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);
    const ko = language === "korean";

    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    if (!profile) return null;

    return (
        <div className="relative" ref={ref}>
            <Button
                variant="ghost"
                onClick={() => setOpen(!open)}
                className={`h-8 gap-1.5 px-2 text-xs font-semibold border border-black/25 bg-white/25 text-current hover:bg-white/40 hover:text-current ${retroTheme === "mac-classic" ? "rounded-md" : "rounded-none"}`}
            >
                <User className="h-3.5 w-3.5" />
                <span className="max-w-[80px] truncate hidden sm:inline">{profile.nickname}</span>
            </Button>

            {open && (
                <div
                    className={`absolute right-0 top-full mt-1 w-44 z-50 border-2 bg-[var(--retro-surface)] border-[var(--retro-border-light)] border-r-[var(--retro-border-dark)] border-b-[var(--retro-border-dark)] shadow-lg ${retroTheme === "mac-classic" ? "rounded-lg" : ""}`}
                >
                    <div className="p-2 border-b border-[var(--retro-border-mid)]">
                        <p className="text-xs font-semibold text-[var(--retro-text)] truncate">
                            {profile.nickname}
                        </p>
                    </div>
                    <div className="p-1">
                        <button
                            onClick={() => { router.push("/profile"); setOpen(false); }}
                            className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-[var(--retro-text)] hover:bg-[var(--retro-surface-alt)] text-left"
                        >
                            <User className="h-3.5 w-3.5" />
                            {ko ? "프로필" : "Profile"}
                        </button>
                        <button
                            onClick={() => { router.push("/leaderboard"); setOpen(false); }}
                            className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-[var(--retro-text)] hover:bg-[var(--retro-surface-alt)] text-left"
                        >
                            <Trophy className="h-3.5 w-3.5" />
                            {ko ? "랭킹" : "Leaderboard"}
                        </button>
                        <button
                            onClick={async () => { await signOut(); setOpen(false); }}
                            className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-red-600 hover:bg-[var(--retro-surface-alt)] text-left"
                        >
                            <LogOut className="h-3.5 w-3.5" />
                            {ko ? "로그아웃" : "Logout"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
