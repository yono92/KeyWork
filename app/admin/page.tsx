"use client";

import { useEffect, useState } from "react";

interface Stats {
    totalUsers: number;
    totalGames: number;
    activeRooms: number;
}

export default function AdminDashboard() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/admin/stats")
            .then((r) => r.json())
            .then((data: Stats) => setStats(data))
            .catch(() => setStats(null))
            .finally(() => setLoading(false));
    }, []);

    const cards = [
        { label: "총 유저", value: stats?.totalUsers ?? 0, color: "bg-sky-500/15 border-sky-500/30 text-sky-400" },
        { label: "총 게임 기록", value: stats?.totalGames ?? 0, color: "bg-emerald-500/15 border-emerald-500/30 text-emerald-400" },
        { label: "대기 중인 방", value: stats?.activeRooms ?? 0, color: "bg-amber-500/15 border-amber-500/30 text-amber-400" },
    ];

    return (
        <div>
            <h1 className="text-2xl font-bold mb-6">관리자 대시보드</h1>

            {loading ? (
                <p className="text-gray-500">로딩 중...</p>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {cards.map((card) => (
                        <div
                            key={card.label}
                            className={`rounded-xl border p-5 ${card.color}`}
                        >
                            <p className="text-sm opacity-80 mb-1">{card.label}</p>
                            <p className="text-3xl font-bold tabular-nums">{card.value.toLocaleString()}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
