"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Session, User } from "@supabase/supabase-js";
import type { AvatarConfig, Profile } from "@/lib/supabase/types";

interface AuthState {
    user: User | null;
    profile: Profile | null;
    loading: boolean;
}

const buildFallbackNickname = (userId: string, email?: string) => {
    const base = (email?.split("@")[0] ?? "player").replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 12) || "player";
    return `${base}_${userId.slice(0, 6)}`;
};

// 모듈 레벨 싱글턴 — 렌더마다 재생성 방지
const supabase = createClient();

export function useAuth() {
    const [state, setState] = useState<AuthState>({
        user: null,
        profile: null,
        loading: true,
    });
    const requestIdRef = useRef(0);
    const mountedRef = useRef(false);

    const clearAuthState = useCallback(() => {
        if (!mountedRef.current) return;
        setState({ user: null, profile: null, loading: false });
    }, []);

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
            const fallbackNickname = buildFallbackNickname(userId, email);
            await supabase
                .from("profiles")
                .upsert({ id: userId, nickname: fallbackNickname }, { onConflict: "id" });
            profile = await fetchProfile(userId);
        }
        return profile;
    }, [fetchProfile]);

    const syncSessionState = useCallback(async (session: Session | null) => {
        const requestId = ++requestIdRef.current;

        if (!session?.user) {
            if (!mountedRef.current || requestId !== requestIdRef.current) return;
            clearAuthState();
            return;
        }

        try {
            const { data, error } = await supabase.auth.getUser();
            if (error || !data.user) {
                console.warn("Discarding stale auth session", error);
                await supabase.auth.signOut({ scope: "local" });
                if (!mountedRef.current || requestId !== requestIdRef.current) return;
                clearAuthState();
                return;
            }

            const activeUser = data.user;
            const profile = await ensureProfile(activeUser.id, activeUser.email ?? session.user.email);
            if (!mountedRef.current || requestId !== requestIdRef.current) return;
            setState({ user: activeUser, profile, loading: false });
        } catch (err) {
            console.error("Auth state change error:", err);
            if (!mountedRef.current || requestId !== requestIdRef.current) return;
            setState({ user: session.user, profile: null, loading: false });
        }
    }, [clearAuthState, ensureProfile]);

    // 초기 세션 + 인증 상태 변경 리스너
    useEffect(() => {
        mountedRef.current = true;

        const initializeSession = async () => {
            try {
                const { data, error } = await supabase.auth.getSession();
                if (error) throw error;
                await syncSessionState(data.session ?? null);
            } catch (err) {
                console.error("Auth session init error:", err);
                clearAuthState();
            }
        };

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((event, session) => {
            // INITIAL_SESSION도 받아야 getSession 지연 시 loading이 풀리지 않는 상황을 피할 수 있다.
            void syncSessionState(session);
        });

        void initializeSession();

        return () => {
            mountedRef.current = false;
            requestIdRef.current += 1;
            subscription.unsubscribe();
        };
    }, [clearAuthState, syncSessionState]);

    // 회원가입
    const signUp = async (email: string, password: string, nickname: string) => {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (data.user) {
            const { error: profileError } = await supabase
                .from("profiles")
                .insert({ id: data.user.id, nickname });
            if (profileError) {
                const fallbackNickname = buildFallbackNickname(data.user.id, email);
                const { error: fallbackError } = await supabase
                    .from("profiles")
                    .upsert({ id: data.user.id, nickname: fallbackNickname }, { onConflict: "id" });
                if (fallbackError) throw profileError;
            }
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
        requestIdRef.current += 1;
        clearAuthState();
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
        isLoggedIn: !!state.user && !!state.profile,
        signUp,
        signIn,
        signOut,
        updateNickname,
        updateAvatar,
    };
}
