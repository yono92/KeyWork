"use client";

import { useCallback, useEffect, useState } from "react";
import { getDefaultLocalProfile, loadLocalProfile, saveLocalProfile } from "@/lib/localData";
import type { AvatarConfig, LocalProfile } from "@/types/domain";

export function useLocalProfile() {
    const [profile, setProfile] = useState<LocalProfile>(getDefaultLocalProfile);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setProfile(loadLocalProfile());
        setLoading(false);
    }, []);

    const updateNickname = useCallback((nickname: string) => {
        const nextNickname = nickname.trim().slice(0, 20) || "Player";
        setProfile((current) => {
            const next = { ...current, nickname: nextNickname };
            saveLocalProfile(next);
            return next;
        });
    }, []);

    const updateAvatar = useCallback((avatar_config: AvatarConfig) => {
        setProfile((current) => {
            const next = { ...current, avatar_config };
            saveLocalProfile(next);
            return next;
        });
    }, []);

    return { profile, loading, updateNickname, updateAvatar };
}
