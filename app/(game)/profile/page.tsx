"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/components/auth/AuthProvider";
import useTypingStore from "@/store/store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Header from "@/components/Header";
import {
    Award,
    BarChart3,
    CalendarDays,
    Check,
    Clock,
    Gamepad2,
    Mail,
    Paintbrush2,
    PencilLine,
    Search,
    ShieldCheck,
    Sparkles,
    Swords,
    Trophy,
    User,
    UserPlus,
    Users,
    X,
} from "lucide-react";
import PixelAvatar from "@/components/avatar/PixelAvatar";
import AvatarEditor from "@/components/avatar/AvatarEditor";
import type { AvatarConfig } from "@/lib/supabase/types";
import { useUserStats, getModeLabel } from "@/hooks/useUserStats";
import type { DailyMission, RecentMatch, UserStats } from "@/hooks/useUserStats";
import { useAchievements } from "@/hooks/useAchievements";
import { getCategoryLabel } from "@/data/achievements";
import type { AchievementCategory } from "@/data/achievements";
import { useFriends } from "@/hooks/useFriends";
import type { AvatarConfig as AvatarConfigType } from "@/lib/supabase/types";

type FlashMessage = {
    type: "success" | "error";
    text: string;
};

function formatJoinDate(date: string, ko: boolean) {
    return new Date(date).toLocaleDateString(ko ? "ko-KR" : "en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
    });
}

function getThemeLabel(theme: string, ko: boolean) {
    if (theme === "mac-classic") return ko ? "Mac Classic" : "Mac Classic";
    return ko ? "Windows 98" : "Windows 98";
}

function InfoBlock({
    icon: Icon,
    label,
    value,
    helper,
}: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    value: string;
    helper?: string;
}) {
    return (
        <div className="rounded-2xl border border-[var(--retro-border-mid)] bg-[var(--retro-surface-alt)]/80 p-3">
            <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--retro-border-mid)] bg-[var(--retro-surface)]">
                    <Icon className="h-4 w-4 text-[var(--retro-accent)]" />
                </div>
                <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--retro-text)]/45">
                        {label}
                    </p>
                    <p className="mt-1 break-all text-sm font-semibold text-[var(--retro-text)]">
                        {value}
                    </p>
                    {helper && (
                        <p className="mt-1 text-[11px] leading-relaxed text-[var(--retro-text)]/60">
                            {helper}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function ProfilePage() {
    const { user, profile, isLoggedIn, loading, updateNickname, updateAvatar } = useAuthContext();
    const language = useTypingStore((s) => s.language);
    const retroTheme = useTypingStore((s) => s.retroTheme);
    const ko = language === "korean";
    const rounded = retroTheme === "mac-classic";

    const [editing, setEditing] = useState(false);
    const [editingAvatar, setEditingAvatar] = useState(false);
    const [newNickname, setNewNickname] = useState("");
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<FlashMessage | null>(null);
    const userStatsQuery = useUserStats();

    if (loading) {
        return (
            <div className="flex h-full flex-col overflow-hidden">
                <Header />
                <div className="flex flex-1 items-center justify-center px-4">
                    <Card className={`w-full max-w-md ${rounded ? "rounded-3xl" : "rounded-none"}`}>
                        <div className="retro-titlebar h-10 px-3 flex items-center gap-2 border-b border-black/25">
                            <User className="h-4 w-4 text-current" />
                            <span className="text-sm font-semibold text-current">
                                {ko ? "프로필 준비 중" : "Preparing profile"}
                            </span>
                        </div>
                        <CardContent className="p-6 text-center text-sm text-[var(--retro-text)]/60">
                            {ko ? "프로필 편집 도구를 불러오고 있습니다..." : "Loading your profile editor..."}
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    if (!isLoggedIn || !profile) {
        return (
            <div className="flex h-full flex-col overflow-hidden">
                <Header />
                <div className="flex flex-1 items-center justify-center px-4">
                    <Card className={`w-full max-w-md ${rounded ? "rounded-3xl" : "rounded-none"}`}>
                        <div className="retro-titlebar h-10 px-3 flex items-center gap-2 border-b border-black/25">
                            <ShieldCheck className="h-4 w-4 text-current" />
                            <span className="text-sm font-semibold text-current">
                                {ko ? "프로필 접근" : "Profile access"}
                            </span>
                        </div>
                        <CardContent className="space-y-2 p-6 text-center">
                            <p className="text-sm font-semibold text-[var(--retro-text)]">
                                {user && !profile
                                    ? ko
                                        ? "프로필 정보를 불러오지 못했습니다."
                                        : "Could not load your profile."
                                    : ko
                                        ? "로그인이 필요합니다."
                                        : "Login required."}
                            </p>
                            <p className="text-xs leading-relaxed text-[var(--retro-text)]/60">
                                {user && !profile
                                    ? ko
                                        ? "새로고침 후 다시 시도해주세요."
                                        : "Refresh the page and try again."
                                    : ko
                                        ? "로그인 후 닉네임과 아바타를 편집할 수 있습니다."
                                        : "Sign in to edit your nickname and avatar."}
                            </p>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    const email = user?.email ?? (ko ? "이메일 정보 없음" : "No email available");
    const joinedLabel = formatJoinDate(profile.created_at, ko);
    const themeLabel = getThemeLabel(retroTheme, ko);
    const nicknameLength = editing ? newNickname.trim().length : profile.nickname.length;

    const startNicknameEdit = () => {
        setNewNickname(profile.nickname);
        setEditing(true);
        setMessage(null);
    };

    const handleSave = async () => {
        if (!newNickname.trim()) {
            setMessage({
                type: "error",
                text: ko ? "닉네임을 입력해주세요." : "Please enter a nickname.",
            });
            return;
        }

        setSaving(true);
        setMessage(null);

        try {
            await updateNickname(newNickname.trim());
            setEditing(false);
            setMessage({
                type: "success",
                text: ko ? "닉네임이 변경되었습니다." : "Nickname updated.",
            });
        } catch (err) {
            setMessage({
                type: "error",
                text: err instanceof Error ? err.message : ko ? "닉네임 변경에 실패했습니다." : "Failed to update nickname.",
            });
        } finally {
            setSaving(false);
        }
    };

    const handleAvatarSave = async (config: AvatarConfig) => {
        setMessage(null);

        try {
            await updateAvatar(config);
            setEditingAvatar(false);
            setMessage({
                type: "success",
                text: ko ? "아바타가 저장되었습니다." : "Avatar saved.",
            });
        } catch (err) {
            setMessage({
                type: "error",
                text: err instanceof Error ? err.message : ko ? "아바타 저장에 실패했습니다." : "Failed to save avatar.",
            });
        }
    };

    return (
        <div className="flex h-full flex-col overflow-hidden">
            <Header />
            <div className="relative flex-1 min-h-0 overflow-y-auto">
                <div
                    aria-hidden
                    className="pointer-events-none absolute inset-x-0 top-0 h-64 opacity-70"
                    style={{
                        background:
                            "radial-gradient(circle at top left, color-mix(in srgb, var(--retro-accent) 28%, transparent), transparent 48%), radial-gradient(circle at top right, color-mix(in srgb, var(--retro-border-light) 85%, transparent), transparent 38%)",
                    }}
                />
                <div className="mx-auto flex max-w-6xl flex-col gap-4 p-3 sm:p-4 lg:gap-5">
                    <Card className={`relative overflow-hidden ${rounded ? "rounded-[28px]" : "rounded-none"}`}>
                        <div
                            aria-hidden
                            className="absolute inset-0 opacity-80"
                            style={{
                                backgroundImage:
                                    "linear-gradient(135deg, color-mix(in srgb, var(--retro-accent) 12%, transparent), transparent 50%), radial-gradient(circle at 18% 20%, color-mix(in srgb, var(--retro-border-light) 95%, transparent) 0, transparent 28%)",
                            }}
                        />
                        <div className="retro-titlebar relative h-10 px-3 flex items-center justify-between border-b border-black/25">
                            <div className="flex items-center gap-2">
                                <User className="h-4 w-4 text-current" />
                                <span className="text-sm font-semibold text-current">
                                    {ko ? "프로필 스튜디오" : "Profile studio"}
                                </span>
                            </div>
                            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-current/75">
                                {ko ? "온라인 표시 정보" : "Online identity"}
                            </span>
                        </div>

                        <CardContent className="relative p-0">
                            <div className="grid lg:grid-cols-[320px_minmax(0,1fr)]">
                                <section className="border-b border-[var(--retro-border-mid)] p-5 lg:border-b-0 lg:border-r lg:p-6">
                                    <div className="rounded-[24px] border border-[var(--retro-border-mid)] bg-[var(--retro-surface-alt)]/90 p-5 shadow-[6px_6px_0_rgba(0,0,0,0.12)]">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--retro-text)]/45">
                                                    {ko ? "플레이어 카드" : "Player card"}
                                                </p>
                                                <h1 className="mt-2 text-2xl font-black leading-none text-[var(--retro-text)]">
                                                    {profile.nickname}
                                                </h1>
                                                <p className="mt-2 text-sm leading-relaxed text-[var(--retro-text)]/65">
                                                    {ko
                                                        ? "멀티플레이 방 목록, 대전 준비 패널, 랭킹에 노출되는 기본 프로필입니다."
                                                        : "Your public profile across lobbies, ready rooms, and leaderboards."}
                                                </p>
                                            </div>
                                            <div className="rounded-full border border-[var(--retro-border-mid)] bg-[var(--retro-surface)] px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--retro-accent)]">
                                                {ko ? "활성" : "Active"}
                                            </div>
                                        </div>

                                        <div className="mt-5 flex items-center gap-4">
                                            <div className="rounded-[22px] border border-[var(--retro-border-mid)] bg-[var(--retro-surface)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]">
                                                <PixelAvatar
                                                    config={profile.avatar_config}
                                                    nickname={profile.nickname}
                                                    size="xl"
                                                />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--retro-text)]/45">
                                                    {ko ? "표시 이름" : "Display name"}
                                                </p>
                                                <p className="truncate text-lg font-bold text-[var(--retro-text)]">
                                                    {profile.nickname}
                                                </p>
                                                <p className="mt-1 break-all text-xs leading-relaxed text-[var(--retro-text)]/55">
                                                    {email}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                                            <div className="rounded-xl border border-[var(--retro-border-mid)] bg-[var(--retro-surface)] px-3 py-2">
                                                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--retro-text)]/45">
                                                    {ko ? "가입일" : "Joined"}
                                                </p>
                                                <p className="mt-1 text-sm font-semibold text-[var(--retro-text)]">
                                                    {joinedLabel}
                                                </p>
                                            </div>
                                            <div className="rounded-xl border border-[var(--retro-border-mid)] bg-[var(--retro-surface)] px-3 py-2">
                                                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--retro-text)]/45">
                                                    {ko ? "현재 테마" : "Theme"}
                                                </p>
                                                <p className="mt-1 text-sm font-semibold text-[var(--retro-text)]">
                                                    {themeLabel}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="mt-5 flex flex-wrap gap-2">
                                            <Button
                                                onClick={startNicknameEdit}
                                                className={`font-semibold ${rounded ? "rounded-xl" : "rounded-none"}`}
                                            >
                                                <PencilLine className="h-4 w-4" />
                                                {ko ? "닉네임 편집" : "Edit nickname"}
                                            </Button>
                                            <Button
                                                variant="secondary"
                                                onClick={() => {
                                                    setEditingAvatar((prev) => !prev);
                                                    setMessage(null);
                                                }}
                                                className={`font-semibold ${rounded ? "rounded-xl" : "rounded-none"}`}
                                            >
                                                <Paintbrush2 className="h-4 w-4" />
                                                {editingAvatar
                                                    ? ko ? "아바타 닫기" : "Close avatar editor"
                                                    : ko ? "아바타 꾸미기" : "Customize avatar"}
                                            </Button>
                                        </div>
                                    </div>
                                </section>

                                <section className="p-5 lg:p-6">
                                    <div className="grid gap-3 md:grid-cols-3">
                                        <div className="rounded-2xl border border-[var(--retro-border-mid)] bg-[var(--retro-surface-alt)]/85 p-4">
                                            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--retro-text)]/45">
                                                {ko ? "프로필 완성도" : "Profile state"}
                                            </p>
                                            <p className="mt-2 text-2xl font-black leading-none text-[var(--retro-text)]">
                                                {profile.avatar_config ? "100%" : "75%"}
                                            </p>
                                            <p className="mt-2 text-xs leading-relaxed text-[var(--retro-text)]/60">
                                                {ko
                                                    ? "닉네임과 아바타가 모두 설정되어 있으면 대전에서 더 구분감 있게 보입니다."
                                                    : "A nickname and avatar make you easier to recognize in matches."}
                                            </p>
                                        </div>

                                        <div className="rounded-2xl border border-[var(--retro-border-mid)] bg-[var(--retro-surface-alt)]/85 p-4">
                                            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--retro-text)]/45">
                                                {ko ? "표시 범위" : "Visibility"}
                                            </p>
                                            <p className="mt-2 text-2xl font-black leading-none text-[var(--retro-text)]">
                                                {ko ? "공개" : "Public"}
                                            </p>
                                            <p className="mt-2 text-xs leading-relaxed text-[var(--retro-text)]/60">
                                                {ko
                                                    ? "공개 방 목록, 대기방, 랭킹에서 동일한 플레이어 카드로 사용됩니다."
                                                    : "Used consistently in room lists, ready rooms, and leaderboards."}
                                            </p>
                                        </div>

                                        <div className="rounded-2xl border border-[var(--retro-border-mid)] bg-[var(--retro-surface-alt)]/85 p-4">
                                            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--retro-text)]/45">
                                                {ko ? "입력 모드" : "Input mode"}
                                            </p>
                                            <p className="mt-2 text-2xl font-black leading-none text-[var(--retro-text)]">
                                                {ko ? "한/영 전환" : "Bi-lingual"}
                                            </p>
                                            <p className="mt-2 text-xs leading-relaxed text-[var(--retro-text)]/60">
                                                {ko
                                                    ? "닉네임은 최대 20자까지 저장되며, 현재 언어 설정은 UI 표시에 반영됩니다."
                                                    : "Nicknames support up to 20 characters and follow your current UI language."}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mt-4 rounded-[24px] border border-[var(--retro-border-mid)] bg-[var(--retro-surface-alt)]/80 p-5">
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--retro-text)]/45">
                                            {ko ? "편집 가이드" : "Edit guide"}
                                        </p>
                                        <h2 className="mt-2 text-2xl font-black leading-tight text-[var(--retro-text)]">
                                            {ko ? "방에서 바로 구분되는 프로필로 다듬기" : "Tune your profile for instant recognition"}
                                        </h2>
                                        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[var(--retro-text)]/65">
                                            {ko
                                                ? "닉네임은 상대가 가장 먼저 보는 정보이고, 아바타는 방 목록과 준비 화면에서 구분감을 만듭니다. 여기서 바꾸면 온라인 전반에 같은 톤으로 반영됩니다."
                                                : "Your nickname gets read first, while the avatar gives you visual recognition across lobbies and ready rooms. Changes here update your online identity everywhere."}
                                        </p>
                                    </div>

                                    {message && (
                                        <div
                                            className={`mt-4 rounded-2xl border px-4 py-3 ${
                                                message.type === "success"
                                                    ? "border-emerald-700/20 bg-emerald-500/10 text-emerald-700"
                                                    : "border-rose-700/20 bg-rose-500/10 text-rose-700"
                                            }`}
                                        >
                                            <p className="text-xs font-semibold uppercase tracking-[0.14em]">
                                                {message.type === "success"
                                                    ? ko ? "저장 완료" : "Saved"
                                                    : ko ? "확인 필요" : "Needs attention"}
                                            </p>
                                            <p className="mt-1 text-sm font-semibold leading-relaxed">
                                                {message.text}
                                            </p>
                                        </div>
                                    )}
                                </section>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.9fr)]">
                        <div className="space-y-4">
                            <Card className={rounded ? "rounded-[24px]" : "rounded-none"}>
                                <div className="retro-titlebar h-10 px-3 flex items-center gap-2 border-b border-black/25">
                                    <PencilLine className="h-4 w-4 text-current" />
                                    <span className="text-sm font-semibold text-current">
                                        {ko ? "닉네임 편집" : "Nickname editor"}
                                    </span>
                                </div>
                                <CardContent className="space-y-4 p-5">
                                    <div className="rounded-[22px] border border-[var(--retro-border-mid)] bg-[var(--retro-field-bg)]/60 p-4">
                                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--retro-text)]/45">
                                            {ko ? "현재 닉네임" : "Current nickname"}
                                        </p>
                                        {!editing ? (
                                            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                                                <div>
                                                    <p className="text-2xl font-black leading-none text-[var(--retro-text)]">
                                                        {profile.nickname}
                                                    </p>
                                                    <p className="mt-2 text-xs leading-relaxed text-[var(--retro-text)]/60">
                                                        {ko
                                                            ? "온라인 매치와 리더보드에 같은 닉네임으로 표시됩니다."
                                                            : "Shown consistently in online matches and leaderboards."}
                                                    </p>
                                                </div>
                                                <Button
                                                    onClick={startNicknameEdit}
                                                    className={rounded ? "rounded-xl" : "rounded-none"}
                                                >
                                                    {ko ? "변경 시작" : "Start editing"}
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="mt-3 space-y-3">
                                                <div className="flex items-center justify-between gap-3">
                                                    <label className="text-xs font-semibold text-[var(--retro-text)]/70">
                                                        {ko ? "새 닉네임" : "New nickname"}
                                                    </label>
                                                    <span className="text-[11px] font-semibold text-[var(--retro-text)]/45">
                                                        {nicknameLength}/20
                                                    </span>
                                                </div>
                                                <Input
                                                    value={newNickname}
                                                    onChange={(e) => setNewNickname(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === "Enter") {
                                                            e.preventDefault();
                                                            void handleSave();
                                                        }
                                                        if (e.key === "Escape") {
                                                            setEditing(false);
                                                            setNewNickname(profile.nickname);
                                                        }
                                                    }}
                                                    placeholder={profile.nickname}
                                                    maxLength={20}
                                                    className={`h-11 text-sm ${rounded ? "rounded-xl" : "rounded-none"}`}
                                                />
                                                <div className="flex flex-wrap gap-2">
                                                    <Button
                                                        onClick={() => void handleSave()}
                                                        disabled={saving}
                                                        className={rounded ? "rounded-xl" : "rounded-none"}
                                                    >
                                                        {saving ? "..." : ko ? "저장" : "Save"}
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        onClick={() => {
                                                            setEditing(false);
                                                            setNewNickname(profile.nickname);
                                                        }}
                                                        className={rounded ? "rounded-xl" : "rounded-none"}
                                                    >
                                                        {ko ? "취소" : "Cancel"}
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="grid gap-3 sm:grid-cols-2">
                                        <div className="rounded-2xl border border-[var(--retro-border-mid)] bg-[var(--retro-surface-alt)]/80 p-4">
                                            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--retro-text)]/45">
                                                {ko ? "권장 규칙" : "Recommended"}
                                            </p>
                                            <p className="mt-2 text-sm font-semibold text-[var(--retro-text)]">
                                                {ko ? "짧고 읽기 쉬운 이름" : "Short and readable"}
                                            </p>
                                            <p className="mt-2 text-xs leading-relaxed text-[var(--retro-text)]/60">
                                                {ko
                                                    ? "대전 중 빠르게 읽히는 닉네임이 더 잘 기억됩니다."
                                                    : "Names that can be read at a glance work better during matches."}
                                            </p>
                                        </div>
                                        <div className="rounded-2xl border border-[var(--retro-border-mid)] bg-[var(--retro-surface-alt)]/80 p-4">
                                            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--retro-text)]/45">
                                                {ko ? "입력 팁" : "Shortcut"}
                                            </p>
                                            <p className="mt-2 text-sm font-semibold text-[var(--retro-text)]">
                                                {ko ? "Enter 저장, Esc 취소" : "Enter to save, Esc to cancel"}
                                            </p>
                                            <p className="mt-2 text-xs leading-relaxed text-[var(--retro-text)]/60">
                                                {ko
                                                    ? "입력 중에도 빠르게 수정 작업을 마칠 수 있습니다."
                                                    : "Use the keyboard to finish edits faster."}
                                            </p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className={rounded ? "rounded-[24px]" : "rounded-none"}>
                                <div className="retro-titlebar h-10 px-3 flex items-center gap-2 border-b border-black/25">
                                    <Paintbrush2 className="h-4 w-4 text-current" />
                                    <span className="text-sm font-semibold text-current">
                                        {ko ? "아바타 작업실" : "Avatar workshop"}
                                    </span>
                                </div>
                                <CardContent className="space-y-4 p-5">
                                    <div className="rounded-[22px] border border-[var(--retro-border-mid)] bg-[var(--retro-surface-alt)]/80 p-4">
                                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                            <div className="flex items-center gap-4">
                                                <div className="rounded-[20px] border border-[var(--retro-border-mid)] bg-[var(--retro-surface)] p-3">
                                                    <PixelAvatar
                                                        config={profile.avatar_config}
                                                        nickname={profile.nickname}
                                                        size="xl"
                                                    />
                                                </div>
                                                <div>
                                                    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--retro-text)]/45">
                                                        {ko ? "현재 아바타" : "Current avatar"}
                                                    </p>
                                                    <p className="mt-1 text-sm font-semibold text-[var(--retro-text)]">
                                                        {ko ? "픽셀 플레이어 아이콘" : "Pixel player icon"}
                                                    </p>
                                                    <p className="mt-2 text-xs leading-relaxed text-[var(--retro-text)]/60">
                                                        {ko
                                                            ? "방 목록과 멀티플레이 준비 화면에서 바로 보이는 대표 이미지입니다."
                                                            : "This is the avatar shown first in room lists and ready panels."}
                                                    </p>
                                                </div>
                                            </div>
                                            <Button
                                                variant={editingAvatar ? "outline" : "secondary"}
                                                onClick={() => {
                                                    setEditingAvatar((prev) => !prev);
                                                    setMessage(null);
                                                }}
                                                className={rounded ? "rounded-xl" : "rounded-none"}
                                            >
                                                {editingAvatar
                                                    ? ko ? "편집 닫기" : "Close editor"
                                                    : ko ? "아바타 편집" : "Edit avatar"}
                                            </Button>
                                        </div>
                                    </div>

                                    {editingAvatar ? (
                                        <div className="rounded-[22px] border border-[var(--retro-border-mid)] bg-[var(--retro-surface)]/90 p-4">
                                            <AvatarEditor
                                                initial={profile.avatar_config}
                                                nickname={profile.nickname}
                                                onSave={handleAvatarSave}
                                                onCancel={() => setEditingAvatar(false)}
                                            />
                                        </div>
                                    ) : (
                                        <div className="rounded-[22px] border border-dashed border-[var(--retro-border-mid)] bg-[var(--retro-bg)]/50 p-5">
                                            <p className="text-sm font-semibold text-[var(--retro-text)]">
                                                {ko ? "아바타 편집기를 열어 헤어, 눈, 모자, 악세서리를 조합해보세요." : "Open the editor to combine hair, eyes, hats, and accessories."}
                                            </p>
                                            <p className="mt-2 text-xs leading-relaxed text-[var(--retro-text)]/60">
                                                {ko
                                                    ? "지금 스타일이 마음에 들지 않으면 바로 수정하고 저장할 수 있습니다."
                                                    : "If the current look feels flat, you can rework and save it immediately."}
                                            </p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>

                        <div className="space-y-4">
                            <Card className={rounded ? "rounded-[24px]" : "rounded-none"}>
                                <div className="retro-titlebar h-10 px-3 flex items-center gap-2 border-b border-black/25">
                                    <ShieldCheck className="h-4 w-4 text-current" />
                                    <span className="text-sm font-semibold text-current">
                                        {ko ? "계정 정보" : "Account details"}
                                    </span>
                                </div>
                                <CardContent className="space-y-3 p-5">
                                    <InfoBlock
                                        icon={Mail}
                                        label={ko ? "이메일" : "Email"}
                                        value={email}
                                        helper={ko ? "로그인에 사용되는 계정 주소입니다." : "The account email used to sign in."}
                                    />
                                    <InfoBlock
                                        icon={CalendarDays}
                                        label={ko ? "가입일" : "Joined"}
                                        value={joinedLabel}
                                        helper={ko ? "프로필 생성 기준 날짜입니다." : "The date your profile was first created."}
                                    />
                                    <InfoBlock
                                        icon={Sparkles}
                                        label={ko ? "UI 언어" : "UI language"}
                                        value={ko ? "한국어" : "English"}
                                        helper={ko ? "현재 앱 인터페이스에 적용 중인 언어입니다." : "The language currently applied to the app interface."}
                                    />
                                    <InfoBlock
                                        icon={Paintbrush2}
                                        label={ko ? "레트로 테마" : "Retro theme"}
                                        value={themeLabel}
                                        helper={ko ? "프로필과 게임 화면 전체에 적용되는 시각 테마입니다." : "The visual theme applied across the app."}
                                    />
                                </CardContent>
                            </Card>

                            <Card className={rounded ? "rounded-[24px]" : "rounded-none"}>
                                <div className="retro-titlebar h-10 px-3 flex items-center gap-2 border-b border-black/25">
                                    <Sparkles className="h-4 w-4 text-current" />
                                    <span className="text-sm font-semibold text-current">
                                        {ko ? "프로필 팁" : "Profile tips"}
                                    </span>
                                </div>
                                <CardContent className="space-y-3 p-5">
                                    <div className="rounded-2xl border border-[var(--retro-border-mid)] bg-[var(--retro-surface-alt)]/80 p-4">
                                        <p className="text-sm font-semibold text-[var(--retro-text)]">
                                            {ko ? "닉네임은 가독성이 우선입니다." : "Readability beats cleverness."}
                                        </p>
                                        <p className="mt-2 text-xs leading-relaxed text-[var(--retro-text)]/60">
                                            {ko
                                                ? "짧고 구분감 있는 닉네임이 실시간 대전에서 더 잘 보입니다."
                                                : "Short, distinct names are easier to read in real-time matches."}
                                        </p>
                                    </div>
                                    <div className="rounded-2xl border border-[var(--retro-border-mid)] bg-[var(--retro-surface-alt)]/80 p-4">
                                        <p className="text-sm font-semibold text-[var(--retro-text)]">
                                            {ko ? "아바타는 실루엣 차이가 중요합니다." : "Silhouette matters."}
                                        </p>
                                        <p className="mt-2 text-xs leading-relaxed text-[var(--retro-text)]/60">
                                            {ko
                                                ? "모자나 악세서리를 조합하면 방 목록에서 더 빨리 눈에 들어옵니다."
                                                : "Hats and accessories make you easier to spot in room lists."}
                                        </p>
                                    </div>
                                    <div className="rounded-2xl border border-[var(--retro-border-mid)] bg-[var(--retro-surface-alt)]/80 p-4">
                                        <p className="text-sm font-semibold text-[var(--retro-text)]">
                                            {ko ? "변경 내용은 즉시 반영됩니다." : "Changes apply immediately."}
                                        </p>
                                        <p className="mt-2 text-xs leading-relaxed text-[var(--retro-text)]/60">
                                            {ko
                                                ? "저장 후 로비와 멀티플레이 화면에서 바로 새 프로필이 보입니다."
                                                : "After saving, your updated profile appears right away across the online UI."}
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                        <DailyMissionsSection
                            ko={ko}
                            rounded={rounded}
                            stats={userStatsQuery.stats}
                            loading={userStatsQuery.loading}
                        />
                        <UserStatsSection
                            ko={ko}
                            rounded={rounded}
                            stats={userStatsQuery.stats}
                            loading={userStatsQuery.loading}
                        />
                        <AchievementsSection ko={ko} rounded={rounded} />
                        <FriendsSection ko={ko} rounded={rounded} />
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ───── 유저 통계 섹션 ───── */

function formatDate(dateStr: string, ko: boolean) {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffH = Math.floor(diffMs / 3600000);

    if (diffH < 1) return ko ? "방금 전" : "Just now";
    if (diffH < 24) return ko ? `${diffH}시간 전` : `${diffH}h ago`;
    const diffD = Math.floor(diffH / 24);
    if (diffD < 7) return ko ? `${diffD}일 전` : `${diffD}d ago`;
    return d.toLocaleDateString(ko ? "ko-KR" : "en-US", { month: "short", day: "numeric" });
}

function MatchRow({ match, ko }: { match: RecentMatch; ko: boolean }) {
    return (
        <div className="flex items-center gap-3 rounded-xl border border-[var(--retro-border-mid)] bg-[var(--retro-surface)] px-3 py-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-[var(--retro-border-mid)] bg-[var(--retro-surface-alt)] text-xs font-bold text-[var(--retro-accent)]">
                {match.isMultiplayer
                    ? match.isWin ? "W" : "L"
                    : "#"}
            </div>
            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[var(--retro-text)]">
                    {getModeLabel(match.gameMode, ko)}
                </p>
                <p className="text-[11px] text-[var(--retro-text)]/55">
                    {match.score.toLocaleString()}{ko ? "점" : "pts"}
                    {match.accuracy != null && ` · ${match.accuracy}%`}
                    {match.wpm != null && ` · ${match.wpm} WPM`}
                </p>
            </div>
            <span className="shrink-0 text-[11px] font-medium text-[var(--retro-text)]/45">
                {formatDate(match.createdAt, ko)}
            </span>
        </div>
    );
}

function getMissionLabel(mission: DailyMission, ko: boolean) {
    switch (mission.id) {
        case "plays":
            return {
                title: ko ? "오늘 3판 플레이" : "Play 3 games today",
                helper: ko ? "짧게라도 세 번 플레이해 오늘 루프를 채우세요." : "Finish three runs to lock in today's loop.",
            };
        case "modes":
            return {
                title: ko ? "오늘 2개 모드 플레이" : "Try 2 modes today",
                helper: ko ? "한 모드에만 머무르지 말고 다른 모드도 섞어보세요." : "Mix in another mode instead of grinding just one.",
            };
        case "multiplayer":
            return {
                title: ko ? "오늘 멀티 1판 완료" : "Finish 1 multiplayer match",
                helper: ko ? "경쟁 루프를 유지하려면 매일 한 번은 사람과 붙는 게 좋습니다." : "One real match a day keeps the competitive loop alive.",
            };
    }
}

function DailyMissionsSection({
    ko,
    rounded,
    stats,
    loading,
}: {
    ko: boolean;
    rounded: boolean;
    stats: UserStats | null;
    loading: boolean;
}) {
    if (loading) {
        return (
            <Card className={`${rounded ? "rounded-[24px]" : "rounded-none"} lg:col-span-2`}>
                <div className="retro-titlebar h-10 px-3 flex items-center gap-2 border-b border-black/25">
                    <CalendarDays className="h-4 w-4 text-current" />
                    <span className="text-sm font-semibold text-current">
                        {ko ? "오늘의 루프" : "Daily loop"}
                    </span>
                </div>
                <CardContent className="p-6 text-center text-sm text-[var(--retro-text)]/60">
                    {ko ? "일일 미션을 계산하는 중..." : "Calculating today's missions..."}
                </CardContent>
            </Card>
        );
    }

    if (!stats) return null;

    const { activity } = stats;

    return (
        <Card className={`${rounded ? "rounded-[24px]" : "rounded-none"} lg:col-span-2`}>
            <div className="retro-titlebar h-10 px-3 flex items-center justify-between border-b border-black/25">
                <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-current" />
                    <span className="text-sm font-semibold text-current">
                        {ko ? "오늘의 루프" : "Daily loop"}
                    </span>
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-current/75">
                    {activity.completedMissionCount}/{activity.dailyMissions.length}
                </span>
            </div>
            <CardContent className="p-5">
                <div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
                    <div className="rounded-[22px] border border-[var(--retro-border-mid)] bg-[var(--retro-surface-alt)]/85 p-4">
                        <div className="flex items-start justify-between gap-3">
                            <div>
                                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--retro-text)]/45">
                                    {ko ? "연속 플레이" : "Streak"}
                                </p>
                                <p className="mt-2 text-4xl font-black leading-none text-[var(--retro-text)]">
                                    {activity.currentStreak}
                                </p>
                                <p className="mt-1 text-sm font-semibold text-[var(--retro-text)]/65">
                                    {ko ? "일 연속" : "days in a row"}
                                </p>
                            </div>
                            <div className={`rounded-full border px-2 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${
                                activity.activeToday
                                    ? "border-emerald-600/25 bg-emerald-500/10 text-emerald-700"
                                    : "border-amber-600/25 bg-amber-500/10 text-amber-700"
                            }`}>
                                {activity.activeToday
                                    ? ko ? "오늘 유지 중" : "Active today"
                                    : ko ? "오늘 플레이 필요" : "Play today"}
                            </div>
                        </div>

                        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                            <div className="rounded-xl border border-[var(--retro-border-mid)] bg-[var(--retro-surface)] px-3 py-2">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--retro-text)]/45">
                                    {ko ? "최고 스트릭" : "Best streak"}
                                </p>
                                <p className="mt-1 text-lg font-bold text-[var(--retro-text)]">
                                    {activity.longestStreak}{ko ? "일" : " days"}
                                </p>
                            </div>
                            <div className="rounded-xl border border-[var(--retro-border-mid)] bg-[var(--retro-surface)] px-3 py-2">
                                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--retro-text)]/45">
                                    {ko ? "최근 7일" : "Last 7 days"}
                                </p>
                                <div className="mt-2 flex gap-1.5">
                                    {activity.recentDays.map((day) => (
                                        <div
                                            key={day.key}
                                            className={`flex-1 rounded-lg border px-1 py-2 text-center ${
                                                day.played
                                                    ? "border-[var(--retro-accent)]/30 bg-[var(--retro-accent)]/15"
                                                    : "border-[var(--retro-border-mid)] bg-[var(--retro-bg)]/60"
                                            }`}
                                            title={`${day.key} · ${day.playCount}${ko ? "회" : " plays"}`}
                                        >
                                            <p className="text-[10px] font-semibold uppercase text-[var(--retro-text)]/45">
                                                {day.label}
                                            </p>
                                            <p className="mt-1 text-xs font-bold text-[var(--retro-text)]">
                                                {day.played ? day.playCount : "—"}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-3">
                        {activity.dailyMissions.map((mission) => {
                            const labels = getMissionLabel(mission, ko);
                            const progressPercent = Math.min((mission.current / mission.target) * 100, 100);

                            return (
                                <div
                                    key={mission.id}
                                    className="rounded-[22px] border border-[var(--retro-border-mid)] bg-[var(--retro-surface-alt)]/80 p-4"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="text-sm font-bold text-[var(--retro-text)]">
                                                {labels.title}
                                            </p>
                                            <p className="mt-1 text-xs leading-relaxed text-[var(--retro-text)]/60">
                                                {labels.helper}
                                            </p>
                                        </div>
                                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${
                                            mission.completed
                                                ? "border-emerald-600/25 bg-emerald-500/10 text-emerald-700"
                                                : "border-[var(--retro-border-mid)] bg-[var(--retro-surface)] text-[var(--retro-text)]/45"
                                        }`}>
                                            {mission.completed ? <Check className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
                                        </div>
                                    </div>

                                    <div className="mt-3 flex items-center justify-between text-[11px] font-semibold text-[var(--retro-text)]/55">
                                        <span>{ko ? "진행도" : "Progress"}</span>
                                        <span>{mission.current}/{mission.target}</span>
                                    </div>
                                    <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-[var(--retro-border-mid)]">
                                        <div
                                            className={`h-full rounded-full transition-all ${
                                                mission.completed ? "bg-emerald-500" : "bg-[var(--retro-accent)]"
                                            }`}
                                            style={{ width: `${progressPercent}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function UserStatsSection({
    ko,
    rounded,
    stats,
    loading,
}: {
    ko: boolean;
    rounded: boolean;
    stats: UserStats | null;
    loading: boolean;
}) {

    if (loading) {
        return (
            <Card className={rounded ? "rounded-[24px]" : "rounded-none"}>
                <div className="retro-titlebar h-10 px-3 flex items-center gap-2 border-b border-black/25">
                    <BarChart3 className="h-4 w-4 text-current" />
                    <span className="text-sm font-semibold text-current">
                        {ko ? "내 전적" : "My Stats"}
                    </span>
                </div>
                <CardContent className="p-6 text-center text-sm text-[var(--retro-text)]/60">
                    {ko ? "통계를 불러오는 중..." : "Loading stats..."}
                </CardContent>
            </Card>
        );
    }

    if (!stats) return null;

    const { totalPlays, modeStats, multiplayer, mostPlayedMode, recentMatches } = stats;

    return (
        <>
            {/* 종합 통계 */}
            <Card className={rounded ? "rounded-[24px]" : "rounded-none"}>
                <div className="retro-titlebar h-10 px-3 flex items-center justify-between border-b border-black/25">
                    <div className="flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-current" />
                        <span className="text-sm font-semibold text-current">
                            {ko ? "내 전적" : "My Stats"}
                        </span>
                    </div>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-current/75">
                        {ko ? "종합 요약" : "Summary"}
                    </span>
                </div>
                <CardContent className="p-5">
                    <div className="grid gap-3 sm:grid-cols-3">
                        <div className="rounded-2xl border border-[var(--retro-border-mid)] bg-[var(--retro-surface-alt)]/85 p-4">
                            <div className="flex items-center gap-2">
                                <Gamepad2 className="h-4 w-4 text-[var(--retro-accent)]" />
                                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--retro-text)]/45">
                                    {ko ? "총 플레이" : "Total plays"}
                                </p>
                            </div>
                            <p className="mt-2 text-3xl font-black leading-none text-[var(--retro-text)]">
                                {totalPlays.toLocaleString()}
                            </p>
                        </div>

                        <div className="rounded-2xl border border-[var(--retro-border-mid)] bg-[var(--retro-surface-alt)]/85 p-4">
                            <div className="flex items-center gap-2">
                                <Swords className="h-4 w-4 text-[var(--retro-accent)]" />
                                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--retro-text)]/45">
                                    {ko ? "멀티 승률" : "MP Win rate"}
                                </p>
                            </div>
                            <p className="mt-2 text-3xl font-black leading-none text-[var(--retro-text)]">
                                {multiplayer.total > 0 ? `${multiplayer.winRate}%` : "—"}
                            </p>
                            {multiplayer.total > 0 && (
                                <p className="mt-1 text-xs text-[var(--retro-text)]/55">
                                    {multiplayer.wins}W {multiplayer.losses}L / {multiplayer.total}
                                </p>
                            )}
                        </div>

                        <div className="rounded-2xl border border-[var(--retro-border-mid)] bg-[var(--retro-surface-alt)]/85 p-4">
                            <div className="flex items-center gap-2">
                                <Trophy className="h-4 w-4 text-[var(--retro-accent)]" />
                                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--retro-text)]/45">
                                    {ko ? "최다 모드" : "Most played"}
                                </p>
                            </div>
                            <p className="mt-2 text-xl font-black leading-tight text-[var(--retro-text)]">
                                {mostPlayedMode ? getModeLabel(mostPlayedMode, ko) : "—"}
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* 모드별 통계 */}
            <Card className={rounded ? "rounded-[24px]" : "rounded-none"}>
                <div className="retro-titlebar h-10 px-3 flex items-center gap-2 border-b border-black/25">
                    <Trophy className="h-4 w-4 text-current" />
                    <span className="text-sm font-semibold text-current">
                        {ko ? "모드별 기록" : "Records by mode"}
                    </span>
                </div>
                <CardContent className="p-5">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {modeStats.map((ms) => (
                            <div
                                key={ms.mode}
                                className="rounded-2xl border border-[var(--retro-border-mid)] bg-[var(--retro-surface-alt)]/80 p-4"
                            >
                                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--retro-accent)]">
                                    {getModeLabel(ms.mode, ko)}
                                </p>
                                {ms.playCount > 0 ? (
                                    <>
                                        <p className="mt-2 text-2xl font-black leading-none text-[var(--retro-text)]">
                                            {ms.bestScore.toLocaleString()}
                                        </p>
                                        <div className="mt-2 flex items-center gap-3 text-xs text-[var(--retro-text)]/60">
                                            <span>{ms.playCount}{ko ? "회" : " plays"}</span>
                                            {ms.avgAccuracy != null && (
                                                <span>{ko ? "정확도" : "Acc"} {ms.avgAccuracy}%</span>
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    <p className="mt-3 text-sm font-semibold text-[var(--retro-text)]/40">
                                        {ko ? "아직 기록 없음" : "No records yet"}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* 최근 매치 */}
            <Card className={rounded ? "rounded-[24px]" : "rounded-none"}>
                <div className="retro-titlebar h-10 px-3 flex items-center gap-2 border-b border-black/25">
                    <Clock className="h-4 w-4 text-current" />
                    <span className="text-sm font-semibold text-current">
                        {ko ? "최근 매치" : "Recent matches"}
                    </span>
                </div>
                <CardContent className="p-5">
                    {recentMatches.length > 0 ? (
                        <div className="space-y-2">
                            {recentMatches.map((m) => (
                                <MatchRow key={m.id} match={m} ko={ko} />
                            ))}
                        </div>
                    ) : (
                        <div className="rounded-2xl border border-dashed border-[var(--retro-border-mid)] bg-[var(--retro-bg)]/50 p-5 text-center">
                            <p className="text-sm font-semibold text-[var(--retro-text)]/50">
                                {ko ? "아직 플레이 기록이 없습니다." : "No match history yet."}
                            </p>
                            <p className="mt-1 text-xs text-[var(--retro-text)]/40">
                                {ko ? "게임을 플레이하면 여기에 기록이 표시됩니다." : "Play a game and your records will appear here."}
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </>
    );
}

/* ───── 업적 섹션 ───── */

const CATEGORY_ORDER: AchievementCategory[] = [
    "beginner", "mode-master", "record", "grinder", "multiplayer",
];

const FRIEND_CHALLENGE_MODES = [
    { id: "tetris", labelKo: "테트리스", labelEn: "Tetris", path: "/tetris" },
    { id: "word-chain", labelKo: "끝말잇기", labelEn: "Word Chain", path: "/word-chain" },
] as const;

function AchievementsSection({ ko, rounded }: { ko: boolean; rounded: boolean }) {
    const { achievements, unlockedCount, totalCount, loading } = useAchievements();
    const [filterCat, setFilterCat] = useState<AchievementCategory | "all">("all");

    if (loading) {
        return (
            <Card className={rounded ? "rounded-[24px]" : "rounded-none"}>
                <div className="retro-titlebar h-10 px-3 flex items-center gap-2 border-b border-black/25">
                    <Award className="h-4 w-4 text-current" />
                    <span className="text-sm font-semibold text-current">
                        {ko ? "업적" : "Achievements"}
                    </span>
                </div>
                <CardContent className="p-6 text-center text-sm text-[var(--retro-text)]/60">
                    {ko ? "업적을 불러오는 중..." : "Loading achievements..."}
                </CardContent>
            </Card>
        );
    }

    if (achievements.length === 0) return null;

    const filtered = filterCat === "all"
        ? achievements
        : achievements.filter((a) => a.def.category === filterCat);

    return (
        <Card className={rounded ? "rounded-[24px]" : "rounded-none"}>
            <div className="retro-titlebar h-10 px-3 flex items-center justify-between border-b border-black/25">
                <div className="flex items-center gap-2">
                    <Award className="h-4 w-4 text-current" />
                    <span className="text-sm font-semibold text-current">
                        {ko ? "업적" : "Achievements"}
                    </span>
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-current/75">
                    {unlockedCount}/{totalCount}
                </span>
            </div>
            <CardContent className="p-5">
                {/* 진행률 바 */}
                <div className="mb-4 rounded-xl border border-[var(--retro-border-mid)] bg-[var(--retro-surface-alt)] p-3">
                    <div className="flex items-center justify-between text-xs font-semibold text-[var(--retro-text)]/60">
                        <span>{ko ? "해금 진행" : "Progress"}</span>
                        <span>{totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0}%</span>
                    </div>
                    <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-[var(--retro-border-mid)]">
                        <div
                            className="h-full rounded-full bg-[var(--retro-accent)] transition-all"
                            style={{ width: `${totalCount > 0 ? (unlockedCount / totalCount) * 100 : 0}%` }}
                        />
                    </div>
                </div>

                {/* 카테고리 필터 */}
                <div className="mb-4 flex flex-wrap gap-1.5">
                    <button
                        onClick={() => setFilterCat("all")}
                        className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                            filterCat === "all"
                                ? "bg-[var(--retro-accent)] text-[var(--retro-text-inverse)]"
                                : "border border-[var(--retro-border-mid)] bg-[var(--retro-surface)] text-[var(--retro-text)]/60 hover:bg-[var(--retro-surface-alt)]"
                        }`}
                    >
                        {ko ? "전체" : "All"}
                    </button>
                    {CATEGORY_ORDER.map((cat) => (
                        <button
                            key={cat}
                            onClick={() => setFilterCat(cat)}
                            className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                                filterCat === cat
                                    ? "bg-[var(--retro-accent)] text-[var(--retro-text-inverse)]"
                                    : "border border-[var(--retro-border-mid)] bg-[var(--retro-surface)] text-[var(--retro-text)]/60 hover:bg-[var(--retro-surface-alt)]"
                            }`}
                        >
                            {getCategoryLabel(cat, ko)}
                        </button>
                    ))}
                </div>

                {/* 업적 그리드 */}
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {filtered.map((a) => (
                        <div
                            key={a.def.id}
                            className={`rounded-xl border p-3 transition-colors ${
                                a.unlocked
                                    ? "border-[var(--retro-accent)]/30 bg-[var(--retro-surface-alt)]"
                                    : "border-[var(--retro-border-mid)] bg-[var(--retro-surface)] opacity-50"
                            }`}
                        >
                            <div className="flex items-start gap-2.5">
                                <span className={`text-xl ${a.unlocked ? "" : "grayscale"}`}>
                                    {a.def.icon}
                                </span>
                                <div className="min-w-0 flex-1">
                                    <p className={`text-sm font-bold ${
                                        a.unlocked ? "text-[var(--retro-text)]" : "text-[var(--retro-text)]/50"
                                    }`}>
                                        {ko ? a.def.name.ko : a.def.name.en}
                                    </p>
                                    <p className="mt-0.5 text-[11px] leading-relaxed text-[var(--retro-text)]/50">
                                        {ko ? a.def.description.ko : a.def.description.en}
                                    </p>
                                    {a.unlocked && a.unlockedAt && (
                                        <p className="mt-1 text-[10px] font-medium text-[var(--retro-accent)]">
                                            {new Date(a.unlockedAt).toLocaleDateString(ko ? "ko-KR" : "en-US", {
                                                month: "short", day: "numeric",
                                            })}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}

/* ───── 친구 섹션 ───── */

function FriendsSection({ ko, rounded }: { ko: boolean; rounded: boolean }) {
    const router = useRouter();
    const {
        friends,
        incomingRequests,
        outgoingRequests,
        loading,
        searchUsers,
        sendRequest,
        acceptRequest,
        removeFriendship,
    } = useFriends();

    const [showSearch, setShowSearch] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<{ id: string; nickname: string; avatar_config: AvatarConfigType | null }[]>([]);
    const [searching, setSearching] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
    const [challengeMode, setChallengeMode] = useState<(typeof FRIEND_CHALLENGE_MODES)[number]["id"]>("tetris");

    const handleSearch = async () => {
        if (searchQuery.trim().length < 2) return;
        setSearching(true);
        try {
            const results = await searchUsers(searchQuery);
            setSearchResults(results);
        } finally {
            setSearching(false);
        }
    };

    const handleSendRequest = async (targetId: string) => {
        try {
            await sendRequest(targetId);
        } catch {
            // 이미 요청 중이거나 친구인 경우
        }
    };

    const handleRemove = async (friendshipId: number) => {
        await removeFriendship(friendshipId);
        setDeleteConfirm(null);
    };

    const handleChallenge = (friendId: string) => {
        const selected = FRIEND_CHALLENGE_MODES.find((mode) => mode.id === challengeMode);
        if (!selected) return;
        router.push(`${selected.path}?online=1&inviteTarget=${encodeURIComponent(friendId)}`);
    };

    if (loading) {
        return (
            <Card className={rounded ? "rounded-[24px]" : "rounded-none"}>
                <div className="retro-titlebar h-10 px-3 flex items-center gap-2 border-b border-black/25">
                    <Users className="h-4 w-4 text-current" />
                    <span className="text-sm font-semibold text-current">
                        {ko ? "친구" : "Friends"}
                    </span>
                </div>
                <CardContent className="p-6 text-center text-sm text-[var(--retro-text)]/60">
                    {ko ? "친구 목록을 불러오는 중..." : "Loading friends..."}
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className={rounded ? "rounded-[24px]" : "rounded-none"}>
            <div className="retro-titlebar h-10 px-3 flex items-center justify-between border-b border-black/25">
                <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-current" />
                    <span className="text-sm font-semibold text-current">
                        {ko ? "친구" : "Friends"}
                    </span>
                </div>
                <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-current/75">
                    {friends.length}{ko ? "명" : ""}
                </span>
            </div>
            <CardContent className="p-5 space-y-4">
                {/* 받은 요청 */}
                {incomingRequests.length > 0 && (
                    <div>
                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--retro-accent)]">
                            {ko ? `받은 요청 (${incomingRequests.length})` : `Requests (${incomingRequests.length})`}
                        </p>
                        <div className="space-y-1.5">
                            {incomingRequests.map((req) => (
                                <div
                                    key={req.friendshipId}
                                    className="flex items-center gap-2.5 rounded-xl border border-[var(--retro-accent)]/20 bg-[var(--retro-accent)]/5 px-3 py-2"
                                >
                                    <PixelAvatar config={req.avatarConfig} nickname={req.nickname} size="sm" />
                                    <span className="flex-1 truncate text-sm font-semibold text-[var(--retro-text)]">
                                        {req.nickname}
                                    </span>
                                    <button
                                        onClick={() => void acceptRequest(req.friendshipId)}
                                        className="rounded-lg bg-[var(--retro-accent)] p-1.5 text-[var(--retro-text-inverse)] hover:opacity-80"
                                    >
                                        <Check className="h-3.5 w-3.5" />
                                    </button>
                                    <button
                                        onClick={() => void removeFriendship(req.friendshipId)}
                                        className="rounded-lg border border-[var(--retro-border-mid)] bg-[var(--retro-surface)] p-1.5 text-[var(--retro-text)]/50 hover:text-red-500"
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {outgoingRequests.length > 0 && (
                    <div>
                        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--retro-text)]/45">
                            {ko ? `보낸 요청 (${outgoingRequests.length})` : `Sent requests (${outgoingRequests.length})`}
                        </p>
                        <div className="space-y-1.5">
                            {outgoingRequests.map((req) => (
                                <div
                                    key={req.friendshipId}
                                    className="flex items-center gap-2.5 rounded-xl border border-[var(--retro-border-mid)] bg-[var(--retro-surface)] px-3 py-2"
                                >
                                    <PixelAvatar config={req.avatarConfig} nickname={req.nickname} size="sm" />
                                    <div className="min-w-0 flex-1">
                                        <p className="truncate text-sm font-semibold text-[var(--retro-text)]">
                                            {req.nickname}
                                        </p>
                                        <p className="text-[10px] text-[var(--retro-text)]/40">
                                            {ko ? "수락 대기 중" : "Waiting for response"}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => void removeFriendship(req.friendshipId)}
                                        className="rounded-lg border border-[var(--retro-border-mid)] bg-[var(--retro-surface-alt)] px-2 py-1 text-[10px] font-bold text-[var(--retro-text)]/55 hover:text-red-500"
                                    >
                                        {ko ? "취소" : "Cancel"}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="rounded-xl border border-[var(--retro-border-mid)] bg-[var(--retro-surface-alt)]/80 p-3">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--retro-text)]/50">
                                {ko ? "친구 도전" : "Friend challenge"}
                            </p>
                            <p className="mt-1 text-xs leading-relaxed text-[var(--retro-text)]/60">
                                {ko
                                    ? "게임을 고른 뒤 친구 카드에서 바로 도전장을 보낼 수 있습니다."
                                    : "Pick a game, then send a challenge directly from any friend card."}
                            </p>
                        </div>
                        <Swords className="h-4 w-4 text-[var(--retro-accent)]" />
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                        {FRIEND_CHALLENGE_MODES.map((mode) => (
                            <button
                                key={mode.id}
                                onClick={() => setChallengeMode(mode.id)}
                                className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                                    challengeMode === mode.id
                                        ? "bg-[var(--retro-accent)] text-[var(--retro-text-inverse)]"
                                        : "border border-[var(--retro-border-mid)] bg-[var(--retro-surface)] text-[var(--retro-text)]/60 hover:bg-[var(--retro-surface-alt)]"
                                }`}
                            >
                                {ko ? mode.labelKo : mode.labelEn}
                            </button>
                        ))}
                    </div>
                </div>

                {/* 친구 목록 */}
                {friends.length > 0 ? (
                    <div className="space-y-1.5">
                        {friends.map((f) => (
                            <div
                                key={f.friendshipId}
                                className="flex items-center gap-2.5 rounded-xl border border-[var(--retro-border-mid)] bg-[var(--retro-surface)] px-3 py-2"
                            >
                                <PixelAvatar config={f.avatarConfig} nickname={f.nickname} size="sm" />
                                <span className="flex-1 truncate text-sm font-semibold text-[var(--retro-text)]">
                                    {f.nickname}
                                </span>
                                <button
                                    onClick={() => handleChallenge(f.friendId)}
                                    className="rounded-lg border border-[var(--retro-accent)]/25 bg-[var(--retro-accent)]/10 px-2 py-1 text-[10px] font-bold text-[var(--retro-accent)] hover:bg-[var(--retro-accent)]/15"
                                >
                                    {ko ? "도전" : "Challenge"}
                                </button>
                                {deleteConfirm === f.friendshipId ? (
                                    <button
                                        onClick={() => void handleRemove(f.friendshipId)}
                                        className="rounded-lg bg-red-500/10 px-2 py-1 text-[10px] font-bold text-red-500"
                                    >
                                        {ko ? "삭제 확인" : "Confirm"}
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => setDeleteConfirm(f.friendshipId)}
                                        className="rounded p-1 text-[var(--retro-text)]/30 hover:text-red-500"
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    !showSearch && (
                        <div className="rounded-2xl border border-dashed border-[var(--retro-border-mid)] bg-[var(--retro-bg)]/50 p-4 text-center">
                            <p className="text-sm font-semibold text-[var(--retro-text)]/50">
                                {ko ? "아직 친구가 없습니다" : "No friends yet"}
                            </p>
                            <p className="mt-1 text-xs text-[var(--retro-text)]/40">
                                {ko ? "닉네임으로 검색하여 친구를 추가하세요" : "Search by nickname to add friends"}
                            </p>
                        </div>
                    )
                )}

                {/* 친구 추가 검색 */}
                {showSearch ? (
                    <div className="space-y-2.5 rounded-xl border border-[var(--retro-border-mid)] bg-[var(--retro-surface-alt)]/80 p-3">
                        <div className="flex items-center justify-between">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--retro-text)]/50">
                                {ko ? "닉네임 검색" : "Search nickname"}
                            </p>
                            <button
                                onClick={() => { setShowSearch(false); setSearchResults([]); setSearchQuery(""); }}
                                className="text-[var(--retro-text)]/40 hover:text-[var(--retro-text)]"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        </div>
                        <div className="flex gap-1.5">
                            <Input
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter") void handleSearch(); }}
                                placeholder={ko ? "닉네임 입력 (2자 이상)" : "Enter nickname (min 2)"}
                                className={`h-8 flex-1 text-sm ${rounded ? "rounded-lg" : "rounded-none"}`}
                            />
                            <Button
                                size="sm"
                                onClick={() => void handleSearch()}
                                disabled={searching || searchQuery.trim().length < 2}
                                className={`h-8 px-2.5 ${rounded ? "rounded-lg" : "rounded-none"}`}
                            >
                                <Search className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                        {searchResults.length > 0 && (
                            <div className="max-h-[160px] space-y-1 overflow-y-auto">
                                {searchResults.map((u) => {
                                    const alreadyFriend = friends.some((f) => f.friendId === u.id);
                                    const alreadySent = outgoingRequests.some((req) => req.userId === u.id);
                                    return (
                                        <div
                                            key={u.id}
                                            className="flex items-center gap-2 rounded-lg border border-[var(--retro-border-mid)] bg-[var(--retro-surface)] px-2.5 py-1.5"
                                        >
                                            <PixelAvatar config={u.avatar_config} nickname={u.nickname} size="sm" />
                                            <span className="flex-1 truncate text-sm font-semibold text-[var(--retro-text)]">
                                                {u.nickname}
                                            </span>
                                            {alreadyFriend ? (
                                                <span className="text-[10px] font-bold text-[var(--retro-accent)]">
                                                    {ko ? "친구" : "Friend"}
                                                </span>
                                            ) : alreadySent ? (
                                                <span className="text-[10px] font-bold text-[var(--retro-text)]/40">
                                                    {ko ? "요청됨" : "Sent"}
                                                </span>
                                            ) : (
                                                <button
                                                    onClick={() => void handleSendRequest(u.id)}
                                                    className="rounded-lg bg-[var(--retro-accent)] p-1.5 text-[var(--retro-text-inverse)] hover:opacity-80"
                                                >
                                                    <UserPlus className="h-3 w-3" />
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                        {searching && (
                            <p className="text-center text-xs text-[var(--retro-text)]/40">
                                {ko ? "검색 중..." : "Searching..."}
                            </p>
                        )}
                    </div>
                ) : (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowSearch(true)}
                        className={`w-full gap-1.5 text-xs ${rounded ? "rounded-xl" : "rounded-none"}`}
                    >
                        <UserPlus className="h-3.5 w-3.5" />
                        {ko ? "친구 추가" : "Add Friend"}
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}
