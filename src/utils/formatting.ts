export function formatPlayTime(
    ms: number,
    locale: "ko" | "en" = "en",
): string {
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    if (locale === "ko") {
        return `${min}분 ${sec.toString().padStart(2, "0")}초`;
    }
    return `${min}:${sec.toString().padStart(2, "0")}`;
}
