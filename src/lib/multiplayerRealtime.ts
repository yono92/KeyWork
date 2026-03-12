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
