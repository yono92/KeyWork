import { useState, useEffect } from "react";

interface ScreenSize {
    isMobile: boolean;
    isShortScreen: boolean;
    isLargeScreen: boolean;
    width: number;
    height: number;
}

export function useScreenSize(): ScreenSize {
    const [size, setSize] = useState<ScreenSize>({
        isMobile: false,
        isShortScreen: false,
        isLargeScreen: false,
        width: 0,
        height: 0,
    });

    useEffect(() => {
        const update = () => {
            const w = window.innerWidth;
            const h = window.innerHeight;
            setSize({
                isMobile: w <= 768 || /iPhone|iPad|iPod|Android/i.test(navigator.userAgent),
                isShortScreen: h <= 900,
                isLargeScreen: w >= 1440 && h >= 900,
                width: w,
                height: h,
            });
        };

        update();
        window.addEventListener("resize", update);
        return () => window.removeEventListener("resize", update);
    }, []);

    return size;
}
