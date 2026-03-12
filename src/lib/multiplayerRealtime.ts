export const ROOM_TTL_MS = 60 * 60 * 1000;

interface BroadcastPayload {
    senderId?: string | null;
}

export function isOwnBroadcast(payload: BroadcastPayload | null | undefined, userId: string) {
    if (!userId) return false;
    return payload?.senderId === userId;
}

export function pickStartingTurnUserId(hostUserId: string, opponentUserId: string, hostStarts: boolean) {
    return hostStarts ? hostUserId : opponentUserId;
}

export function getRoomCutoffIso(now = Date.now()) {
    return new Date(now - ROOM_TTL_MS).toISOString();
}

export function isRoomExpired(createdAt: string, now = Date.now()) {
    return new Date(createdAt).getTime() < now - ROOM_TTL_MS;
}

interface AutoStartInput {
    isHost: boolean;
    myReady: boolean;
    opponentReady: boolean;
    opponentUserId: string | null;
    phase: string;
}

export function canAutoStartMatch({ isHost, myReady, opponentReady, opponentUserId, phase }: AutoStartInput) {
    return isHost && phase === "waiting" && !!opponentUserId && myReady && opponentReady;
}

export function shouldResetForMatchStart(previousPhase: string | null, nextPhase: string) {
    return previousPhase !== "countdown" && nextPhase === "countdown";
}
