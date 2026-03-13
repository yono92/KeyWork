"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthContext } from "@/components/auth/AuthProvider";
import type { CustomText } from "@/lib/supabase/types";

export function useCustomTexts(language: "korean" | "english") {
    const { user } = useAuthContext();
    const [texts, setTexts] = useState<CustomText[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchTexts = useCallback(async () => {
        if (!user) {
            setTexts([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const supabase = createClient();
            const { data, error } = await supabase
                .from("custom_texts")
                .select("*")
                .eq("user_id", user.id)
                .eq("language", language)
                .order("updated_at", { ascending: false });

            if (error) throw error;
            setTexts(data ?? []);
        } catch {
            setTexts([]);
        } finally {
            setLoading(false);
        }
    }, [user, language]);

    useEffect(() => {
        fetchTexts();
    }, [fetchTexts]);

    const addText = useCallback(
        async (title: string, content: string) => {
            if (!user) return null;
            const supabase = createClient();
            const { data, error } = await supabase
                .from("custom_texts")
                .insert({
                    user_id: user.id,
                    title: title.trim().slice(0, 50),
                    content: content.trim().slice(0, 2000),
                    language,
                })
                .select()
                .single();

            if (error) throw error;
            setTexts((prev) => [data, ...prev]);
            return data;
        },
        [user, language],
    );

    const updateText = useCallback(
        async (id: number, title: string, content: string) => {
            if (!user) return;
            const supabase = createClient();
            const { error } = await supabase
                .from("custom_texts")
                .update({
                    title: title.trim().slice(0, 50),
                    content: content.trim().slice(0, 2000),
                    updated_at: new Date().toISOString(),
                })
                .eq("id", id)
                .eq("user_id", user.id);

            if (error) throw error;
            setTexts((prev) =>
                prev.map((t) =>
                    t.id === id ? { ...t, title: title.trim(), content: content.trim(), updated_at: new Date().toISOString() } : t,
                ),
            );
        },
        [user],
    );

    const deleteText = useCallback(
        async (id: number) => {
            if (!user) return;
            const supabase = createClient();
            const { error } = await supabase
                .from("custom_texts")
                .delete()
                .eq("id", id)
                .eq("user_id", user.id);

            if (error) throw error;
            setTexts((prev) => prev.filter((t) => t.id !== id));
        },
        [user],
    );

    return { texts, loading, addText, updateText, deleteText, refetch: fetchTexts };
}
