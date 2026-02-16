export function formatPlayTime(ms: number): string {
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}분 ${sec.toString().padStart(2, "0")}초`;
}
