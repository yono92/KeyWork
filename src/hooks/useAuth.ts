"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import type { AvatarConfig, Profile } from "@/lib/supabase/types";

interface AuthState {
    user: User | null;
    profile: Profile | null;
    loading: boolean;
}

// 모듈 레벨 싱글턴 — 렌더마다 재생성 방지
const supabase = createClient();

export function useAuth() {
    const [state, setState] = useState<AuthState>({
        user: null,
        profile: null,
        loading: true,
    });

    // 프로필 조회
    const fetchProfile = useCallback(async (userId: string) => {
        const { data } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", userId)
            .single();
        return data;
    }, []);

    // 프로필이 없으면 자동 생성 (회원가입 시 INSERT 실패 복구)
    const ensureProfile = useCallback(async (userId: string, email?: string) => {
        let profile = await fetchProfile(userId);
        if (!profile) {
            const fallbackNickname = email?.split("@")[0] ?? `user_${userId.slice(0, 6)}`;
            await supabase
                .from("profiles")
                .upsert({ id: userId, nickname: fallbackNickname }, { onConflict: "id" });
            profile = await fetchProfile(userId);
        }
        return profile;
    }, [fetchProfile]);

    // 초기 세션 + 인증 상태 변경 리스너
    useEffect(() => {
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(async (_event, session) => {
            try {
                if (session?.user) {
                    const profile = await ensureProfile(session.user.id, session.user.email);
                    setState({ user: session.user, profile, loading: false });
                } else {
                    setState({ user: null, profile: null, loading: false });
                }
            } catch (err) {
                console.error("Auth state change error:", err);
                // 에러가 나도 loading은 풀어야 UI가 보임
                setState({ user: session?.user ?? null, profile: null, loading: false });
            }
        });

        return () => subscription.unsubscribe();
    }, [ensureProfile]);

    // 회원가입
    const signUp = async (email: string, password: string, nickname: string) => {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (data.user) {
            const { error: profileError } = await supabase
                .from("profiles")
                .insert({ id: data.user.id, nickname });
            if (profileError) throw profileError;
        }
        return data;
    };

    // 로그인
    const signIn = async (email: string, password: string) => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        if (error) throw error;
        return data;
    };

    // 로그아웃
    const signOut = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    };

    // 닉네임 변경
    const updateNickname = async (nickname: string) => {
        if (!state.user) throw new Error("Not logged in");
        const { error } = await supabase
            .from("profiles")
            .update({ nickname })
            .eq("id", state.user.id);
        if (error) throw error;
        setState((prev) => ({
            ...prev,
            profile: prev.profile ? { ...prev.profile, nickname } : null,
        }));
    };

    // 아바타 저장
    const updateAvatar = async (avatarConfig: AvatarConfig) => {
        if (!state.user) throw new Error("Not logged in");
        const { error } = await supabase
            .from("profiles")
            .update({ avatar_config: avatarConfig as unknown as Record<string, unknown> })
            .eq("id", state.user.id);
        if (error) throw error;
        setState((prev) => ({
            ...prev,
            profile: prev.profile ? { ...prev.profile, avatar_config: avatarConfig } : null,
        }));
    };

    return {
        user: state.user,
        profile: state.profile,
        loading: state.loading,
        isLoggedIn: !!state.user,
        signUp,
        signIn,
        signOut,
        updateNickname,
        updateAvatar,
    };
}
