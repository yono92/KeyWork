"use client";

import React, { useState } from "react";
import { createPortal } from "react-dom";
import { useAuthContext } from "./AuthProvider";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import useTypingStore from "@/store/store";

type Mode = "login" | "signup";

interface AuthModalProps {
    onClose: () => void;
}

export default function AuthModal({ onClose }: AuthModalProps) {
    const { signIn, signUp } = useAuthContext();
    const retroTheme = useTypingStore((s) => s.retroTheme);
    const language = useTypingStore((s) => s.language);
    const [mode, setMode] = useState<Mode>("login");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [nickname, setNickname] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const ko = language === "korean";

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            if (mode === "signup") {
                if (!nickname.trim()) {
                    setError(ko ? "닉네임을 입력해주세요" : "Nickname is required");
                    setLoading(false);
                    return;
                }
                await signUp(email, password, nickname.trim());
            } else {
                await signIn(email, password);
            }
            onClose();
        } catch (err) {
            const raw = err instanceof Error ? err.message : "";
            let msg: string;
            if (raw.includes("Invalid login")) {
                msg = ko ? "이메일 또는 비밀번호가 올바르지 않습니다" : "Invalid email or password";
            } else if (raw.includes("User already registered")) {
                msg = ko ? "이미 가입된 이메일입니다" : "Email already registered";
            } else if (raw.includes("duplicate key") || raw.includes("unique") || raw.includes("already exists")) {
                msg = ko ? "이미 사용 중인 닉네임입니다" : "Nickname already taken";
            } else if (raw.includes("Password should be at least")) {
                msg = ko ? "비밀번호는 6자 이상이어야 합니다" : "Password must be at least 6 characters";
            } else if (raw.includes("Unable to validate email")) {
                msg = ko ? "올바른 이메일 주소를 입력해주세요" : "Please enter a valid email address";
            } else if (raw) {
                msg = raw;
            } else {
                msg = ko ? "오류가 발생했습니다" : "An error occurred";
            }
            setError(msg);
        } finally {
            setLoading(false);
        }
    };

    return createPortal(
        <div
            className="fixed inset-0 z-[9999] flex items-center justify-center"
            style={{
                background: "rgba(0,0,0,0.6)",
            }}
            onClick={onClose}
        >
            <Card
                className={`w-full max-w-sm mx-4 ${retroTheme === "mac-classic" ? "rounded-xl" : "rounded-none"}`}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="retro-titlebar h-10 px-3 flex items-center justify-between border-b border-black/25">
                    <span className="text-sm font-semibold text-current">
                        {mode === "login"
                            ? ko ? "로그인" : "Login"
                            : ko ? "회원가입" : "Sign Up"}
                    </span>
                    <button
                        onClick={onClose}
                        className="w-6 h-6 flex items-center justify-center text-current hover:opacity-70 text-lg leading-none"
                        aria-label="Close"
                    >
                        ×
                    </button>
                </div>
                <CardContent className="p-5">
                    <form onSubmit={handleSubmit} className="space-y-3">
                        {mode === "signup" && (
                            <div>
                                <label className="text-xs font-semibold text-[var(--retro-text)]/70 mb-1 block">
                                    {ko ? "닉네임" : "Nickname"}
                                </label>
                                <Input
                                    type="text"
                                    value={nickname}
                                    onChange={(e) => setNickname(e.target.value)}
                                    placeholder={ko ? "닉네임 입력" : "Enter nickname"}
                                    maxLength={20}
                                    required
                                />
                            </div>
                        )}
                        <div>
                            <label className="text-xs font-semibold text-[var(--retro-text)]/70 mb-1 block">
                                {ko ? "이메일" : "Email"}
                            </label>
                            <Input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="email@example.com"
                                required
                            />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-[var(--retro-text)]/70 mb-1 block">
                                {ko ? "비밀번호" : "Password"}
                            </label>
                            <Input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder={ko ? "비밀번호 입력" : "Enter password"}
                                minLength={6}
                                required
                            />
                        </div>

                        {error && (
                            <p className="text-xs text-red-600 bg-red-50 border border-red-200 p-2">
                                {error}
                            </p>
                        )}

                        <Button
                            type="submit"
                            disabled={loading}
                            className={`w-full font-semibold ${retroTheme === "mac-classic" ? "rounded-lg" : "rounded-none"}`}
                        >
                            {loading
                                ? "..."
                                : mode === "login"
                                    ? ko ? "로그인" : "Login"
                                    : ko ? "회원가입" : "Sign Up"}
                        </Button>
                    </form>

                    <div className="mt-4 text-center">
                        <button
                            type="button"
                            onClick={() => {
                                setMode(mode === "login" ? "signup" : "login");
                                setError("");
                            }}
                            className="text-xs text-[var(--retro-accent)] hover:underline"
                        >
                            {mode === "login"
                                ? ko ? "계정이 없으신가요? 회원가입" : "Don't have an account? Sign Up"
                                : ko ? "이미 계정이 있으신가요? 로그인" : "Already have an account? Login"}
                        </button>
                    </div>
                </CardContent>
            </Card>
        </div>,
        document.body,
    );
}
