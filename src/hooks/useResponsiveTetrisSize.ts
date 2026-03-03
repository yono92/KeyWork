import { useEffect, useRef, useState } from "react";

const BOARD_HEIGHT = 20;

/**
 * Tetris 보드 반응형 크기 계산 — ResizeObserver + window resize
 */
export function useResponsiveTetrisSize() {
    const sectionRef = useRef<HTMLElement>(null);
    const [isMobile, setIsMobile] = useState(false);
    const [cellSize, setCellSize] = useState(14);
    const [miniCellSize, setMiniCellSize] = useState(10);
    const [sidePanelWidth, setSidePanelWidth] = useState(96);

    useEffect(() => {
        const update = () => {
            const el = sectionRef.current;
            const w = el?.clientWidth ?? window.innerWidth;
            const top = el?.getBoundingClientRect().top ?? 0;
            const availH = Math.max(360, window.innerHeight - top - 4);
            const mobile = w < 760;
            setIsMobile(mobile);

            if (mobile) {
                const padH = 170;
                const maxByH = Math.floor((availH - padH - 12) / BOARD_HEIGHT);
                const maxByW = Math.floor((w - 22) / 14.5);
                const c = Math.max(10, Math.min(maxByH, maxByW));
                const side = Math.max(70, Math.floor(c * 4.5));
                setCellSize(c);
                setMiniCellSize(Math.max(6, Math.floor(c * 0.5)));
                setSidePanelWidth(side);
                return;
            }

            const maxByH = Math.floor((availH - 14) / BOARD_HEIGHT);
            const maxByW = Math.floor((w - 26) / 15);
            const c = Math.max(14, Math.min(48, maxByH, maxByW));
            const side = Math.max(120, Math.floor(c * 5));
            setCellSize(c);
            setMiniCellSize(Math.max(10, Math.floor(c * 0.6)));
            setSidePanelWidth(side);
        };

        update();
        const ro = typeof ResizeObserver !== "undefined" && sectionRef.current
            ? new ResizeObserver(() => update())
            : null;
        if (ro && sectionRef.current) ro.observe(sectionRef.current);
        window.addEventListener("resize", update);
        return () => {
            window.removeEventListener("resize", update);
            ro?.disconnect();
        };
    }, []);

    return { sectionRef, cellSize, miniCellSize, sidePanelWidth, isMobile };
}
