"use client";

import { useCallback, useEffect, useState } from "react";
import { loadCustomTexts, saveCustomTexts } from "@/lib/localData";
import type { CustomText } from "@/types/domain";

export function useCustomTexts(language: "korean" | "english") {
    const [texts, setTexts] = useState<CustomText[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchTexts = useCallback(async () => {
        setLoading(true);
        const next = loadCustomTexts()
            .filter((text) => text.language === language)
            .sort((a, b) => b.updated_at.localeCompare(a.updated_at));
        setTexts(next);
        setLoading(false);
    }, [language]);

    useEffect(() => {
        fetchTexts();
    }, [fetchTexts]);

    const addText = useCallback(
        async (title: string, content: string) => {
            const now = new Date().toISOString();
            const data: CustomText = {
                id: Date.now(),
                title: title.trim().slice(0, 50),
                content: content.trim().slice(0, 2000),
                language,
                created_at: now,
                updated_at: now,
            };
            const allTexts = [data, ...loadCustomTexts()];
            saveCustomTexts(allTexts);
            setTexts((prev) => [data, ...prev]);
            return data;
        },
        [language],
    );

    const updateText = useCallback(
        async (id: number, title: string, content: string) => {
            const nextTitle = title.trim().slice(0, 50);
            const nextContent = content.trim().slice(0, 2000);
            const updatedAt = new Date().toISOString();
            saveCustomTexts(loadCustomTexts().map((text) => (
                text.id === id ? { ...text, title: nextTitle, content: nextContent, updated_at: updatedAt } : text
            )));
            setTexts((prev) =>
                prev.map((t) =>
                    t.id === id ? { ...t, title: nextTitle, content: nextContent, updated_at: updatedAt } : t,
                ),
            );
        },
        [],
    );

    const deleteText = useCallback(
        async (id: number) => {
            saveCustomTexts(loadCustomTexts().filter((text) => text.id !== id));
            setTexts((prev) => prev.filter((t) => t.id !== id));
        },
        [],
    );

    return { texts, loading, addText, updateText, deleteText, refetch: fetchTexts };
}
