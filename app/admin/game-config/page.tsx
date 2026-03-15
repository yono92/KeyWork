"use client";

import { useEffect, useState, useCallback } from "react";

const DEFAULT_CONFIGS: Record<string, Record<string, unknown>> = {
    "falling-words": {
        easy: { spawnMul: 1.5, speedMul: 0.7, lives: 3, scorePerLevel: 400 },
        normal: { spawnMul: 1.0, speedMul: 1.0, lives: 3, scorePerLevel: 500 },
        hard: { spawnMul: 0.7, speedMul: 1.3, lives: 3, scorePerLevel: 600 },
    },
    "word-chain": {
        easy: { timeLimit: 20, lives: 3 },
        normal: { timeLimit: 15, lives: 3 },
        hard: { timeLimit: 10, lives: 3 },
    },
    "typing-defense": {
        easy: { speedMul: 0.6, spawnMul: 1.5, lives: 5, scoreMul: 0.7 },
        normal: { speedMul: 1.0, spawnMul: 1.0, lives: 3, scoreMul: 1.0 },
        hard: { speedMul: 1.4, spawnMul: 0.7, lives: 2, scoreMul: 1.5 },
    },
    dictation: {
        easy: { rate: 0.8, autoPlays: 3, scoreMul: 0.7 },
        normal: { rate: 1.0, autoPlays: 2, scoreMul: 1.0 },
        hard: { rate: 1.2, autoPlays: 1, scoreMul: 1.5 },
    },
};

interface GameConfigRow {
    game_mode: string;
    config: Record<string, unknown>;
    updated_at: string;
}

export default function AdminGameConfigPage() {
    const [configs, setConfigs] = useState<GameConfigRow[]>([]);
    const [editMode, setEditMode] = useState<string | null>(null);
    const [editJson, setEditJson] = useState("");
    const [jsonError, setJsonError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);

    const fetchConfigs = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/game-config");
            const data = await res.json() as { configs: GameConfigRow[] };
            setConfigs(data.configs ?? []);
        } catch {
            setConfigs([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { void fetchConfigs(); }, [fetchConfigs]);

    const startEdit = (gameMode: string) => {
        const existing = configs.find((c) => c.game_mode === gameMode);
        const config = existing?.config ?? DEFAULT_CONFIGS[gameMode] ?? {};
        setEditMode(gameMode);
        setEditJson(JSON.stringify(config, null, 2));
        setJsonError(null);
    };

    const handleSave = async () => {
        if (!editMode) return;
        try {
            JSON.parse(editJson);
        } catch {
            setJsonError("유효하지 않은 JSON입니다");
            return;
        }

        setSaving(true);
        try {
            await fetch("/api/admin/game-config", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    game_mode: editMode,
                    config: JSON.parse(editJson),
                }),
            });
            setEditMode(null);
            void fetchConfigs();
        } finally {
            setSaving(false);
        }
    };

    const allGameModes = Object.keys(DEFAULT_CONFIGS);

    return (
        <div>
            <h1 className="text-2xl font-bold mb-6">게임 설정</h1>
            <p className="text-sm text-gray-400 mb-4">
                게임별 난이도 파라미터를 수정합니다. 저장 후 새 게임부터 적용됩니다.
            </p>

            {loading ? (
                <p className="text-gray-500">로딩 중...</p>
            ) : (
                <div className="space-y-4">
                    {allGameModes.map((gameMode) => {
                        const existing = configs.find((c) => c.game_mode === gameMode);
                        const config = existing?.config ?? DEFAULT_CONFIGS[gameMode];
                        const isEditing = editMode === gameMode;

                        return (
                            <div
                                key={gameMode}
                                className="rounded-lg border border-gray-800 bg-gray-900/50 p-4"
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <div>
                                        <h3 className="font-bold text-white">{gameMode}</h3>
                                        {existing && (
                                            <span className="text-xs text-gray-500">
                                                마지막 수정: {new Date(existing.updated_at).toLocaleString("ko-KR")}
                                            </span>
                                        )}
                                        {!existing && (
                                            <span className="text-xs text-amber-500">기본값 (DB에 저장되지 않음)</span>
                                        )}
                                    </div>
                                    {!isEditing && (
                                        <button
                                            onClick={() => startEdit(gameMode)}
                                            className="px-3 py-1.5 rounded-lg text-sm bg-sky-600/20 text-sky-400 hover:bg-sky-600/30"
                                        >
                                            수정
                                        </button>
                                    )}
                                </div>

                                {isEditing ? (
                                    <div>
                                        <textarea
                                            value={editJson}
                                            onChange={(e) => { setEditJson(e.target.value); setJsonError(null); }}
                                            rows={12}
                                            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:border-sky-500 resize-y"
                                        />
                                        {jsonError && (
                                            <p className="text-xs text-rose-400 mt-1">{jsonError}</p>
                                        )}
                                        <div className="flex gap-2 mt-2">
                                            <button
                                                onClick={handleSave}
                                                disabled={saving}
                                                className="px-3 py-1.5 rounded-lg text-sm bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 disabled:opacity-50"
                                            >
                                                {saving ? "저장 중..." : "저장"}
                                            </button>
                                            <button
                                                onClick={() => setEditMode(null)}
                                                className="px-3 py-1.5 rounded-lg text-sm bg-gray-700 text-gray-300 hover:bg-gray-600"
                                            >
                                                취소
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setEditJson(JSON.stringify(DEFAULT_CONFIGS[gameMode] ?? {}, null, 2));
                                                    setJsonError(null);
                                                }}
                                                className="px-3 py-1.5 rounded-lg text-sm bg-amber-600/20 text-amber-400 hover:bg-amber-600/30"
                                            >
                                                기본값으로 초기화
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <pre className="text-xs text-gray-400 bg-gray-800/50 rounded-lg p-3 overflow-auto max-h-40">
                                        {JSON.stringify(config, null, 2)}
                                    </pre>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
