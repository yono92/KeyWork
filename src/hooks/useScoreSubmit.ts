"use client";

import { useCallback, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { GameScoreInsert } from "@/lib/supabase/types";
import { useAuthContext } from "@/components/auth/AuthProvider";

export function useScoreSubmit() {
    const { user } = useAuthContext();
    const [submitting, setSubmitting] = useState(false);

    const submitScore = useCallback(
        async (score: Omit<GameScoreInsert, "user_id">) => {
            if (!user) return null;
            setSubmitting(true);
            try {
                const supabase = createClient();
                const { data, error } = await supabase
                    .from("game_scores")
                    .insert({ ...score, user_id: user.id })
                    .select()
                    .single();
                if (error) throw error;
                return data;
            } finally {
                setSubmitting(false);
            }
        },
        [user],
    );

    return { submitScore, submitting, isLoggedIn: !!user };
}
