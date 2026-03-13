import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useFriends } from "@/hooks/useFriends";

const mocks = vi.hoisted(() => {
    const currentUser = { value: { id: "me" } as { id: string } | null };
    const friendshipsOr = vi.fn();
    const profilesIn = vi.fn();
    const profileSearchLimit = vi.fn();
    const profileSearchNeq = vi.fn(() => ({ limit: profileSearchLimit }));
    const profileSearchIlike = vi.fn(() => ({ neq: profileSearchNeq }));

    const from = vi.fn((table: string) => {
        if (table === "friendships") {
            return {
                select: vi.fn(() => ({ or: friendshipsOr })),
            };
        }

        if (table === "profiles") {
            return {
                select: vi.fn(() => ({
                    in: profilesIn,
                    ilike: profileSearchIlike,
                })),
            };
        }

        throw new Error(`Unexpected table: ${table}`);
    });

    return {
        currentUser,
        from,
        friendshipsOr,
        profileSearchIlike,
        profileSearchLimit,
        profileSearchNeq,
        profilesIn,
    };
});

vi.mock("@/lib/supabase/client", () => ({
    createClient: () => ({
        from: mocks.from,
    }),
}));

vi.mock("@/components/auth/AuthProvider", () => ({
    useAuthContext: () => ({
        user: mocks.currentUser.value,
        profile: null,
        isLoggedIn: !!mocks.currentUser.value,
    }),
}));

describe("useFriends", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mocks.currentUser.value = { id: "me" };
        mocks.friendshipsOr.mockResolvedValue({
            data: [
                {
                    id: 1,
                    requester_id: "me",
                    addressee_id: "friend-1",
                    status: "accepted",
                    created_at: "2026-03-13T00:00:00.000Z",
                },
                {
                    id: 2,
                    requester_id: "friend-2",
                    addressee_id: "me",
                    status: "pending",
                    created_at: "2026-03-13T01:00:00.000Z",
                },
                {
                    id: 3,
                    requester_id: "me",
                    addressee_id: "friend-3",
                    status: "pending",
                    created_at: "2026-03-13T02:00:00.000Z",
                },
            ],
            error: null,
        });
        mocks.profilesIn.mockResolvedValue({
            data: [
                { id: "friend-1", nickname: "Alpha", avatar_config: null },
                { id: "friend-2", nickname: "Bravo", avatar_config: null },
                { id: "friend-3", nickname: "Charlie", avatar_config: null },
            ],
            error: null,
        });
        mocks.profileSearchLimit.mockResolvedValue({
            data: [{ id: "search-1", nickname: "SearchUser", avatar_config: null }],
            error: null,
        });
    });

    it("hydrates friends, incoming requests, and outgoing requests", async () => {
        const { result } = renderHook(() => useFriends());

        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.friends.map((friend) => friend.nickname)).toEqual(["Alpha"]);
        expect(result.current.incomingRequests.map((friend) => friend.nickname)).toEqual(["Bravo"]);
        expect(result.current.outgoingRequests.map((friend) => friend.nickname)).toEqual(["Charlie"]);
        expect(result.current.getFriendshipStatus("friend-1")).toBe("friends");
        expect(result.current.getFriendshipStatus("friend-2")).toBe("pending-received");
        expect(result.current.getFriendshipStatus("friend-3")).toBe("pending-sent");
    });

    it("searches profiles by nickname for signed-in users", async () => {
        const { result } = renderHook(() => useFriends());

        await waitFor(() => expect(result.current.loading).toBe(false));

        let rows: Awaited<ReturnType<typeof result.current.searchUsers>> = [];
        await act(async () => {
            rows = await result.current.searchUsers("sea");
        });

        expect(rows).toEqual([{ id: "search-1", nickname: "SearchUser", avatar_config: null }]);
        expect(mocks.profileSearchIlike).toHaveBeenCalledWith("nickname", "%sea%");
        expect(mocks.profileSearchNeq).toHaveBeenCalledWith("id", "me");
    });
});
