"use client";

import { useMemo, useState } from "react";
import { Award, Database, Edit3, Gamepad2, Save, Sparkles, UserRound } from "lucide-react";
import Header from "@/components/Header";
import AvatarEditor from "@/components/avatar/AvatarEditor";
import PixelAvatar from "@/components/avatar/PixelAvatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAchievements } from "@/hooks/useAchievements";
import { useLocalProfile } from "@/hooks/useLocalProfile";
import { getModeLabel, useUserStats } from "@/hooks/useUserStats";
import useTypingStore from "@/store/store";
import type { AvatarConfig } from "@/types/domain";

export default function ProfilePage() {
    const language = useTypingStore((state) => state.language);
    const retroTheme = useTypingStore((state) => state.retroTheme);
    const ko = language === "korean";
    const rounded = retroTheme === "mac-classic";
    const { profile, loading, updateNickname, updateAvatar } = useLocalProfile();
    const { stats, loading: statsLoading } = useUserStats();
    const { achievements, unlockedCount, totalCount, loading: achievementsLoading } = useAchievements();
    const [nickname, setNickname] = useState("");
    const [editingName, setEditingName] = useState(false);
    const [editingAvatar, setEditingAvatar] = useState(false);

    const unlocked = useMemo(() => achievements.filter((item) => item.unlocked), [achievements]);
    const shell = rounded ? "rounded-2xl" : "rounded-none";

    const startNicknameEdit = () => {
        setNickname(profile.nickname);
        setEditingName(true);
    };

    const saveNickname = () => {
        updateNickname(nickname);
        setEditingName(false);
    };

    const saveAvatar = async (config: AvatarConfig) => {
        updateAvatar(config);
        setEditingAvatar(false);
    };

    return (
        <div className="flex h-full flex-col overflow-hidden">
            <Header />
            <div className="flex-1 overflow-y-auto">
                <div className="mx-auto grid max-w-6xl gap-4 p-3 sm:p-4 lg:grid-cols-[340px_1fr]">
                    <div className="space-y-4">
                        <Card className={shell}>
                            <CardContent className="p-5">
                                <div className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-[var(--retro-text)]/55">
                                    <UserRound className="h-4 w-4" />
                                    {ko ? "로컬 프로필" : "Local profile"}
                                </div>
                                <div className="retro-inset flex flex-col items-center gap-4 p-5">
                                    <PixelAvatar config={profile.avatar_config} nickname={profile.nickname} size="xl" />
                                    {loading ? (
                                        <p className="text-sm text-[var(--retro-text)]/50">...</p>
                                    ) : editingName ? (
                                        <div className="flex w-full gap-2">
                                            <Input
                                                value={nickname}
                                                maxLength={20}
                                                onChange={(event) => setNickname(event.target.value)}
                                                onKeyDown={(event) => event.key === "Enter" && saveNickname()}
                                                aria-label={ko ? "닉네임" : "Nickname"}
                                            />
                                            <Button size="sm" onClick={saveNickname} aria-label={ko ? "저장" : "Save"}>
                                                <Save className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={startNicknameEdit}
                                            className="flex items-center gap-2 text-lg font-black text-[var(--retro-text)] hover:text-[var(--retro-accent)]"
                                        >
                                            {profile.nickname}
                                            <Edit3 className="h-4 w-4" />
                                        </button>
                                    )}
                                </div>
                                <Button className="mt-4 w-full" variant="outline" onClick={() => setEditingAvatar((value) => !value)}>
                                    <Sparkles className="mr-2 h-4 w-4" />
                                    {ko ? "아바타 편집" : "Edit avatar"}
                                </Button>
                            </CardContent>
                        </Card>

                        <Card className={shell}>
                            <CardContent className="space-y-2 p-4 text-xs text-[var(--retro-text)]/65">
                                <div className="flex items-center gap-2 font-bold text-[var(--retro-text)]">
                                    <Database className="h-4 w-4 text-[var(--retro-accent)]" />
                                    {ko ? "이 브라우저에 저장됨" : "Saved in this browser"}
                                </div>
                                <p>{ko ? "계정과 클라우드 동기화 없이 현재 기기에만 보관됩니다." : "No account or cloud sync. Data stays on this device."}</p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="space-y-4">
                        {editingAvatar && (
                            <Card className={shell}>
                                <CardContent className="p-5">
                                    <AvatarEditor
                                        initial={profile.avatar_config}
                                        nickname={profile.nickname}
                                        onSave={saveAvatar}
                                        onCancel={() => setEditingAvatar(false)}
                                    />
                                </CardContent>
                            </Card>
                        )}

                        <div className="grid gap-3 sm:grid-cols-3">
                            <StatCard icon={Gamepad2} label={ko ? "플레이" : "Plays"} value={statsLoading ? "…" : String(stats?.totalPlays ?? 0)} rounded={rounded} />
                            <StatCard icon={Award} label={ko ? "업적" : "Achievements"} value={achievementsLoading ? "…" : `${unlockedCount}/${totalCount}`} rounded={rounded} />
                            <StatCard icon={Sparkles} label={ko ? "연속 기록" : "Streak"} value={statsLoading ? "…" : `${stats?.activity.currentStreak ?? 0}${ko ? "일" : "d"}`} rounded={rounded} />
                        </div>

                        <Card className={shell}>
                            <CardContent className="p-5">
                                <h2 className="mb-4 text-sm font-black uppercase tracking-[0.12em] text-[var(--retro-text)]">
                                    {ko ? "모드별 기록" : "Records by mode"}
                                </h2>
                                <div className="grid gap-2 sm:grid-cols-2">
                                    {(stats?.modeStats ?? []).map((mode) => (
                                        <div key={mode.mode} className="retro-inset flex items-center justify-between px-4 py-3">
                                            <div>
                                                <p className="text-sm font-bold text-[var(--retro-text)]">{getModeLabel(mode.mode, ko)}</p>
                                                <p className="text-[11px] text-[var(--retro-text)]/50">{ko ? `${mode.playCount}회 플레이` : `${mode.playCount} plays`}</p>
                                            </div>
                                            <p className="font-mono text-lg font-black text-[var(--retro-accent)]">{mode.bestScore.toLocaleString()}</p>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>

                        <Card className={shell}>
                            <CardContent className="p-5">
                                <div className="mb-4 flex items-center justify-between">
                                    <h2 className="text-sm font-black uppercase tracking-[0.12em] text-[var(--retro-text)]">{ko ? "해금 업적" : "Unlocked"}</h2>
                                    <span className="text-xs font-bold text-[var(--retro-accent)]">{unlockedCount}/{totalCount}</span>
                                </div>
                                {unlocked.length === 0 ? (
                                    <div className="retro-inset p-6 text-center text-sm text-[var(--retro-text)]/50">
                                        {ko ? "게임 기록을 쌓으면 업적이 해금됩니다." : "Play games to unlock achievements."}
                                    </div>
                                ) : (
                                    <div className="grid gap-2 sm:grid-cols-2">
                                        {unlocked.map(({ def }) => (
                                            <div key={def.id} className="flex items-center gap-3 border border-[var(--retro-border-mid)] bg-[var(--retro-surface-alt)] p-3">
                                                <span className="text-2xl" aria-hidden>{def.icon}</span>
                                                <div>
                                                    <p className="text-sm font-bold text-[var(--retro-text)]">{ko ? def.name.ko : def.name.en}</p>
                                                    <p className="text-[11px] text-[var(--retro-text)]/55">{ko ? def.description.ko : def.description.en}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({ icon: Icon, label, value, rounded }: { icon: typeof Gamepad2; label: string; value: string; rounded: boolean }) {
    return (
        <Card className={rounded ? "rounded-xl" : "rounded-none"}>
            <CardContent className="flex items-center gap-3 p-4">
                <div className="retro-inset flex h-10 w-10 items-center justify-center">
                    <Icon className="h-5 w-5 text-[var(--retro-accent)]" />
                </div>
                <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-[var(--retro-text)]/50">{label}</p>
                    <p className="text-xl font-black tabular-nums text-[var(--retro-text)]">{value}</p>
                </div>
            </CardContent>
        </Card>
    );
}
