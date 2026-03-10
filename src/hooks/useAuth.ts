"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";
import type { Profile } from "@/lib/supabase/types";

interface AuthState {
    user: User | null;
    profile: Profile | null;
    loading: boolean;
}

export function useAuth() {
    const [state, setState] = useState<AuthState>({
        user: null,
        profile: null,
        loading: true,
    });

    const supabase = createClient();

    // 프로필 조회
    const fetchProfile = useCallback(
        async (userId: string) => {
            const { data } = await supabase
                .from("profiles")
                .select("*")
                .eq("id", userId)
                .single();
            return data;
        },
        [supabase],
    );

    // 초기 세션 + 인증 상태 변경 리스너
    useEffect(() => {
        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(async (_event, session) => {
            if (session?.user) {
                const profile = await fetchProfile(session.user.id);
                setState({ user: session.user, profile, loading: false });
            } else {
                setState({ user: null, profile: null, loading: false });
            }
        });

        return () => subscription.unsubscribe();
    }, [supabase, fetchProfile]);

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

    return {
        user: state.user,
        profile: state.profile,
        loading: state.loading,
        isLoggedIn: !!state.user,
        signUp,
        signIn,
        signOut,
        updateNickname,
    };
}
