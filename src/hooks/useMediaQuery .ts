import { useState, useEffect } from "react";

const useMediaQuery = (query: string): boolean => {
    // 서버사이드에서는 기본값으로 false 반환
    const [matches, setMatches] = useState<boolean>(false);

    useEffect(() => {
        // 클라이언트 사이드에서만 실행
        if (typeof window !== "undefined") {
            const media = window.matchMedia(query);
            setMatches(media.matches);

            const listener = (e: MediaQueryListEvent) => {
                setMatches(e.matches);
            };

            media.addEventListener("change", listener);

            return () => {
                media.removeEventListener("change", listener);
            };
        }
    }, [query]);

    // 서버사이드에서는 false 반환, 클라이언트에서는 실제 값 반환
    return matches;
};

export default useMediaQuery;
