import React, { useState, useEffect } from "react";
import useTypingStore from "../../store/store";
import { Badge } from "@/components/ui/badge";

interface DifficultyBadgeProps {
    difficulty: "easy" | "normal" | "hard";
}

const DifficultyBadge: React.FC<DifficultyBadgeProps> = ({ difficulty }) => {
    const [mounted, setMounted] = useState(false);
    const retroTheme = useTypingStore((s) => s.retroTheme);
    useEffect(() => setMounted(true), []);

    // 서버/클라이언트 초기 렌더링에서 "normal"(스토어 기본값)을 사용하여
    // localStorage에서 읽은 값과의 hydration 불일치를 방지
    const d = mounted ? difficulty : "normal";

    return (
        <Badge className={`px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-bold border ${
            retroTheme === "mac-classic" ? "rounded-lg" : "rounded-none"
        } ${
            d === "easy" ? "bg-emerald-500/20 text-emerald-400"
            : d === "normal" ? "bg-sky-500/20 text-sky-400"
            : "bg-rose-500/20 text-rose-400"
        }`}>
            {d === "easy" ? "Easy" : d === "normal" ? "Normal" : "Hard"}
        </Badge>
    );
};

export default DifficultyBadge;
