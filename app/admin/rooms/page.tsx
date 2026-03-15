"use client";

import { useEffect, useState, useCallback } from "react";

const STATUS_OPTIONS = [
    { value: "", label: "전체" },
    { value: "waiting", label: "대기" },
    { value: "playing", label: "게임 중" },
    { value: "finished", label: "종료" },
];

interface RoomRow {
    id: string;
    game_mode: string;
    status: string;
    player1_id: string | null;
    player2_id: string | null;
    winner_id: string | null;
    created_at: string;
}

interface RoomsResponse {
    rooms: RoomRow[];
    total: number;
    page: number;
    totalPages: number;
}

export default function AdminRoomsPage() {
    const [data, setData] = useState<RoomsResponse | null>(null);
    const [page, setPage] = useState(1);
    const [statusFilter, setStatusFilter] = useState("");
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);

    const fetchRooms = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page: String(page) });
            if (statusFilter) params.set("status", statusFilter);
            const res = await fetch(`/api/admin/rooms?${params}`);
            const json = await res.json() as RoomsResponse;
            setData(json);
            setSelected(new Set());
        } catch {
            setData(null);
        } finally {
            setLoading(false);
        }
    }, [page, statusFilter]);

    useEffect(() => { void fetchRooms(); }, [fetchRooms]);

    const handleDelete = async () => {
        if (selected.size === 0) return;
        if (!confirm(`${selected.size}개의 방을 삭제하시겠습니까?`)) return;

        await fetch("/api/admin/rooms", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids: [...selected] }),
        });
        void fetchRooms();
    };

    const toggleSelect = (id: string) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const statusBadge = (status: string) => {
        const colors: Record<string, string> = {
            waiting: "bg-amber-500/20 text-amber-400",
            playing: "bg-emerald-500/20 text-emerald-400",
            finished: "bg-gray-700 text-gray-400",
        };
        return (
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[status] ?? "bg-gray-700 text-gray-400"}`}>
                {status}
            </span>
        );
    };

    return (
        <div>
            <h1 className="text-2xl font-bold mb-6">방 관리</h1>

            <div className="flex flex-wrap items-center gap-3 mb-4">
                <select
                    value={statusFilter}
                    onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                    className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-sky-500"
                >
                    {STATUS_OPTIONS.map((s) => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
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
                                            checked={data?.rooms.length === selected.size && selected.size > 0}
                                            onChange={() => {
                                                if (selected.size === (data?.rooms.length ?? 0)) {
                                                    setSelected(new Set());
                                                } else {
                                                    setSelected(new Set(data?.rooms.map((r) => r.id)));
                                                }
                                            }}
                                        />
                                    </th>
                                    <th className="text-left px-4 py-3">방 코드</th>
                                    <th className="text-left px-4 py-3">게임모드</th>
                                    <th className="text-left px-4 py-3">상태</th>
                                    <th className="text-left px-4 py-3">생성일</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800">
                                {data?.rooms.map((room) => (
                                    <tr key={room.id} className="hover:bg-gray-900/50">
                                        <td className="px-4 py-3">
                                            <input
                                                type="checkbox"
                                                checked={selected.has(room.id)}
                                                onChange={() => toggleSelect(room.id)}
                                            />
                                        </td>
                                        <td className="px-4 py-3 font-mono">{room.id}</td>
                                        <td className="px-4 py-3">{room.game_mode}</td>
                                        <td className="px-4 py-3">{statusBadge(room.status)}</td>
                                        <td className="px-4 py-3 text-gray-400">
                                            {new Date(room.created_at).toLocaleDateString("ko-KR")}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {data && data.totalPages > 1 && (
                        <div className="flex items-center justify-between mt-4 text-sm text-gray-400">
                            <span>총 {data.total}개</span>
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
