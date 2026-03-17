"use client";

import { useEffect, useState, useCallback } from "react";

const GAME_MODES = [
    { value: "", label: "전체" },
    { value: "practice", label: "타이핑 연습" },
    { value: "falling-words", label: "단어 낙하" },
    { value: "word-chain", label: "끝말잇기" },
    { value: "tetris", label: "테트리스" },
    { value: "typing-runner", label: "타이핑 러너" },
];

interface Score {
    id: number;
    user_id: string;
    game_mode: string;
    score: number;
    wpm: number | null;
    accuracy: number | null;
    is_multiplayer: boolean;
    created_at: string;
}

interface ScoresResponse {
    scores: Score[];
    total: number;
    page: number;
    totalPages: number;
}

export default function AdminScoresPage() {
    const [data, setData] = useState<ScoresResponse | null>(null);
    const [page, setPage] = useState(1);
    const [gameMode, setGameMode] = useState("");
    const [sort, setSort] = useState<"created_at" | "score">("created_at");
    const [selected, setSelected] = useState<Set<number>>(new Set());
    const [loading, setLoading] = useState(true);

    const fetchScores = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page: String(page), sort });
            if (gameMode) params.set("game_mode", gameMode);
            const res = await fetch(`/api/admin/scores?${params}`);
            const json = await res.json() as ScoresResponse;
            setData(json);
            setSelected(new Set());
        } catch {
            setData(null);
        } finally {
            setLoading(false);
        }
    }, [page, gameMode, sort]);

    useEffect(() => { void fetchScores(); }, [fetchScores]);

    const handleDelete = async () => {
        if (selected.size === 0) return;
        if (!confirm(`${selected.size}개의 기록을 삭제하시겠습니까?`)) return;

        await fetch("/api/admin/scores", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids: [...selected] }),
        });
        void fetchScores();
    };

    const toggleSelect = (id: number) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    return (
        <div>
            <h1 className="text-2xl font-bold mb-6">점수 관리</h1>

            <div className="flex flex-wrap items-center gap-3 mb-4">
                <select
                    value={gameMode}
                    onChange={(e) => { setGameMode(e.target.value); setPage(1); }}
                    className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-sky-500"
                >
                    {GAME_MODES.map((m) => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                </select>

                <select
                    value={sort}
                    onChange={(e) => setSort(e.target.value as "created_at" | "score")}
                    className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-sky-500"
                >
                    <option value="created_at">최신순</option>
                    <option value="score">점수순</option>
                </select>

                {selected.size > 0 && (
                    <button
                        onClick={handleDelete}
                        className="px-3 py-2 rounded-lg text-sm bg-rose-600/20 text-rose-400 hover:bg-rose-600/30"
                    >
                        선택 삭제 ({selected.size})
                    </button>
                )}
            </div>

            {loading ? (
                <p className="text-gray-500">로딩 중...</p>
            ) : (
                <>
                    <div className="overflow-x-auto rounded-lg border border-gray-800">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-900 text-gray-400">
                                <tr>
                                    <th className="px-4 py-3 w-8">
                                        <input
                                            type="checkbox"
                                            checked={data?.scores.length === selected.size && selected.size > 0}
                                            onChange={() => {
                                                if (selected.size === (data?.scores.length ?? 0)) {
                                                    setSelected(new Set());
                                                } else {
                                                    setSelected(new Set(data?.scores.map((s) => s.id)));
                                                }
                                            }}
                                        />
                                    </th>
                                    <th className="text-left px-4 py-3">게임모드</th>
                                    <th className="text-right px-4 py-3">점수</th>
                                    <th className="text-right px-4 py-3">WPM</th>
                                    <th className="text-right px-4 py-3">정확도</th>
                                    <th className="text-center px-4 py-3">멀티</th>
                                    <th className="text-left px-4 py-3">날짜</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800">
                                {data?.scores.map((score) => (
                                    <tr key={score.id} className="hover:bg-gray-900/50">
                                        <td className="px-4 py-3">
                                            <input
                                                type="checkbox"
                                                checked={selected.has(score.id)}
                                                onChange={() => toggleSelect(score.id)}
                                            />
                                        </td>
                                        <td className="px-4 py-3">{score.game_mode}</td>
                                        <td className="px-4 py-3 text-right tabular-nums">{score.score}</td>
                                        <td className="px-4 py-3 text-right tabular-nums">{score.wpm ?? "-"}</td>
                                        <td className="px-4 py-3 text-right tabular-nums">
                                            {score.accuracy != null ? `${score.accuracy}%` : "-"}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {score.is_multiplayer ? "✓" : ""}
                                        </td>
                                        <td className="px-4 py-3 text-gray-400">
                                            {new Date(score.created_at).toLocaleDateString("ko-KR")}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {data && data.totalPages > 1 && (
                        <div className="flex items-center justify-between mt-4 text-sm text-gray-400">
                            <span>총 {data.total}건</span>
                            <div className="flex gap-2">
                                <button
                                    disabled={page <= 1}
                                    onClick={() => setPage(page - 1)}
                                    className="px-3 py-1 rounded bg-gray-800 disabled:opacity-30 hover:bg-gray-700"
                                >
                                    이전
                                </button>
                                <span className="px-3 py-1">{page} / {data.totalPages}</span>
                                <button
                                    disabled={page >= data.totalPages}
                                    onClick={() => setPage(page + 1)}
                                    className="px-3 py-1 rounded bg-gray-800 disabled:opacity-30 hover:bg-gray-700"
                                >
                                    다음
                                </button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
