"use client";

import React, { useState } from "react";
import { useAuthContext } from "@/components/auth/AuthProvider";
import useTypingStore from "@/store/store";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Header from "@/components/Header";
import { User } from "lucide-react";

export default function ProfilePage() {
    const { profile, isLoggedIn, updateNickname } = useAuthContext();
    const language = useTypingStore((s) => s.language);
    const retroTheme = useTypingStore((s) => s.retroTheme);
    const ko = language === "korean";

    const [editing, setEditing] = useState(false);
    const [newNickname, setNewNickname] = useState("");
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");

    if (!isLoggedIn || !profile) {
        return (
            <div className="flex flex-col h-full overflow-hidden">
                <Header />
                <div className="flex-1 flex items-center justify-center text-sm text-[var(--retro-text)]/60">
                    {ko ? "로그인이 필요합니다" : "Login required"}
                </div>
            </div>
        );
    }

    const handleSave = async () => {
        if (!newNickname.trim()) return;
        setSaving(true);
        setMessage("");
        try {
            await updateNickname(newNickname.trim());
            setEditing(false);
            setMessage(ko ? "닉네임이 변경되었습니다" : "Nickname updated");
        } catch (err) {
            setMessage(
                err instanceof Error ? err.message : ko ? "변경 실패" : "Update failed",
            );
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <Header />
            <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4">
                <Card className={`max-w-md mx-auto ${retroTheme === "mac-classic" ? "rounded-xl" : "rounded-none"}`}>
                    <div className="retro-titlebar h-10 px-3 flex items-center gap-2 border-b border-black/25">
                        <User className="h-4 w-4 text-current" />
                        <span className="text-sm font-semibold text-current">
                            {ko ? "프로필" : "Profile"}
                        </span>
                    </div>
                    <CardContent className="p-5 space-y-4">
                        {/* 아바타 */}
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 bg-[var(--retro-accent)] text-[var(--retro-text-inverse)] flex items-center justify-center text-2xl font-bold border-2 border-[var(--retro-border-dark)]">
                                {profile.nickname.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                {editing ? (
                                    <div className="flex gap-2">
                                        <Input
                                            value={newNickname}
                                            onChange={(e) => setNewNickname(e.target.value)}
                                            placeholder={profile.nickname}
                                            maxLength={20}
                                            className="h-8 text-sm w-32"
                                        />
                                        <Button
                                            onClick={handleSave}
                                            disabled={saving}
                                            className={`h-8 text-xs ${retroTheme === "mac-classic" ? "rounded-md" : "rounded-none"}`}
                                        >
                                            {saving ? "..." : ko ? "저장" : "Save"}
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            onClick={() => setEditing(false)}
                                            className={`h-8 text-xs ${retroTheme === "mac-classic" ? "rounded-md" : "rounded-none"}`}
                                        >
                                            {ko ? "취소" : "Cancel"}
                                        </Button>
                                    </div>
                                ) : (
                                    <div>
                                        <p className="text-lg font-bold text-[var(--retro-text)]">
                                            {profile.nickname}
                                        </p>
                                        <button
                                            onClick={() => {
                                                setNewNickname(profile.nickname);
                                                setEditing(true);
                                            }}
                                            className="text-xs text-[var(--retro-accent)] hover:underline"
                                        >
                                            {ko ? "닉네임 변경" : "Change nickname"}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>

                        {message && (
                            <p className="text-xs text-green-600 bg-green-50 border border-green-200 p-2">
                                {message}
                            </p>
                        )}

                        {/* 가입일 */}
                        <div className="border-t border-[var(--retro-border-mid)] pt-3">
                            <p className="text-xs text-[var(--retro-text)]/60">
                                {ko ? "가입일" : "Joined"}:{" "}
                                <span className="font-medium text-[var(--retro-text)]">
                                    {new Date(profile.created_at).toLocaleDateString()}
                                </span>
                            </p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
