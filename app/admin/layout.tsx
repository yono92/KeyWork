"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
    { href: "/admin", label: "대시보드", icon: "📊" },
    { href: "/admin/users", label: "유저 관리", icon: "👥" },
    { href: "/admin/scores", label: "점수 관리", icon: "🏆" },
    { href: "/admin/rooms", label: "방 관리", icon: "🚪" },
    { href: "/admin/game-config", label: "게임 설정", icon: "⚙️" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    return (
        <div className="min-h-screen bg-gray-950 text-gray-100 flex">
            {/* Sidebar */}
            <aside className="w-56 bg-gray-900 border-r border-gray-800 flex flex-col shrink-0">
                <div className="px-4 py-5 border-b border-gray-800">
                    <Link href="/admin" className="text-lg font-bold text-white">
                        KeyWork Admin
                    </Link>
                </div>
                <nav className="flex-1 py-3">
                    {NAV_ITEMS.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors ${
                                    isActive
                                        ? "bg-sky-600/20 text-sky-400 border-r-2 border-sky-400"
                                        : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/50"
                                }`}
                            >
                                <span>{item.icon}</span>
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>
                <div className="px-4 py-3 border-t border-gray-800">
                    <Link
                        href="/"
                        className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                    >
                        ← 사이트로 돌아가기
                    </Link>
                </div>
            </aside>

            {/* Main content */}
            <main className="flex-1 p-6 overflow-auto">
                {children}
            </main>
        </div>
    );
}
