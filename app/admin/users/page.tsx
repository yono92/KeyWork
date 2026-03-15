"use client";

import { useEffect, useState, useCallback } from "react";

interface AdminUser {
    id: string;
    nickname: string;
    role: string;
    created_at: string;
}

interface UsersResponse {
    users: AdminUser[];
    total: number;
    page: number;
    totalPages: number;
}

export default function AdminUsersPage() {
    const [data, setData] = useState<UsersResponse | null>(null);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({ page: String(page) });
            if (search) params.set("search", search);
            const res = await fetch(`/api/admin/users?${params}`);
            const json = await res.json() as UsersResponse;
            setData(json);
        } catch {
            setData(null);
        } finally {
            setLoading(false);
        }
    }, [page, search]);

    useEffect(() => { void fetchUsers(); }, [fetchUsers]);

    const handleRoleToggle = async (userId: string, currentRole: string) => {
        const newRole = currentRole === "admin" ? "user" : "admin";
        if (!confirm(`이 유저의 역할을 "${newRole}"로 변경하시겠습니까?`)) return;

        await fetch("/api/admin/users", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId, role: newRole }),
        });
        void fetchUsers();
    };

    const handleDelete = async (userId: string, nickname: string) => {
        if (!confirm(`"${nickname}" 유저를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) return;

        await fetch("/api/admin/users", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId }),
        });
        void fetchUsers();
    };

    return (
        <div>
            <h1 className="text-2xl font-bold mb-6">유저 관리</h1>

            <div className="mb-4">
                <input
                    type="text"
                    placeholder="닉네임 검색..."
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm w-64 focus:outline-none focus:border-sky-500"
                />
            </div>

            {loading ? (
                <p className="text-gray-500">로딩 중...</p>
            ) : (
                <>
                    <div className="overflow-x-auto rounded-lg border border-gray-800">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-900 text-gray-400">
                                <tr>
                                    <th className="text-left px-4 py-3">닉네임</th>
                                    <th className="text-left px-4 py-3">역할</th>
                                    <th className="text-left px-4 py-3">가입일</th>
                                    <th className="text-right px-4 py-3">작업</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800">
                                {data?.users.map((user) => (
                                    <tr key={user.id} className="hover:bg-gray-900/50">
                                        <td className="px-4 py-3 font-medium">{user.nickname}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                                                user.role === "admin"
                                                    ? "bg-rose-500/20 text-rose-400"
                                                    : "bg-gray-700 text-gray-300"
                                            }`}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-gray-400">
                                            {new Date(user.created_at).toLocaleDateString("ko-KR")}
                                        </td>
                                        <td className="px-4 py-3 text-right space-x-2">
                                            <button
                                                onClick={() => handleRoleToggle(user.id, user.role)}
                                                className="text-xs px-2 py-1 rounded bg-sky-600/20 text-sky-400 hover:bg-sky-600/30"
                                            >
                                                역할 변경
                                            </button>
                                            <button
                                                onClick={() => handleDelete(user.id, user.nickname)}
                                                className="text-xs px-2 py-1 rounded bg-rose-600/20 text-rose-400 hover:bg-rose-600/30"
                                            >
                                                삭제
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {data && data.totalPages > 1 && (
                        <div className="flex items-center justify-between mt-4 text-sm text-gray-400">
                            <span>총 {data.total}명</span>
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
