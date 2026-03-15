import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * DB에서 게임 설정을 가져오는 훅.
 * fetch 실패 시 fallbackConfig를 반환하여 게임이 항상 작동하도록 보장.
 */
export function useGameConfig<T extends Record<string, unknown>>(
    gameMode: string,
    fallbackConfig: T,
): { config: T; loading: boolean } {
    const [config, setConfig] = useState<T>(fallbackConfig);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        async function fetchConfig() {
            try {
                const supabase = createClient();
                const { data } = await supabase
                    .from("game_config")
                    .select("config")
                    .eq("game_mode", gameMode)
                    .single();

                if (!cancelled && data?.config) {
                    setConfig(data.config as T);
                }
            } catch {
                // DB 실패 시 fallback 유지
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        void fetchConfig();
        return () => { cancelled = true; };
    }, [gameMode, fallbackConfig]);

    return { config, loading };
}
