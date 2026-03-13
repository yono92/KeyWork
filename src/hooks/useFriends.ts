"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuthContext } from "@/components/auth/AuthProvider";
import type { FriendWithProfile, FriendRequest, AvatarConfig } from "@/lib/supabase/types";

interface ProfileRow {
    id: string;
    nickname: string;
    avatar_config: AvatarConfig | null;
}

export function useFriends() {
    const { user } = useAuthContext();
    const [friends, setFriends] = useState<FriendWithProfile[]>([]);
    const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
    const [outgoingRequests, setOutgoingRequests] = useState<FriendRequest[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchFriends = useCallback(async () => {
        if (!user) {
            setFriends([]);
            setIncomingRequests([]);
            setOutgoingRequests([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        try {
            const supabase = createClient();

            // 모든 관련 friendship 조회
            const { data, error } = await supabase
                .from("friendships")
                .select("id, requester_id, addressee_id, status, created_at")
                .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

            if (error) throw error;
            const rows = data ?? [];

            // 친구 ID 수집
            const friendIds = new Set<string>();
            const accepted = rows.filter((r) => r.status === "accepted");
            const pendingIncoming = rows.filter((r) => r.status === "pending" && r.addressee_id === user.id);
            const pendingOutgoing = rows.filter((r) => r.status === "pending" && r.requester_id === user.id);

            for (const r of accepted) {
                friendIds.add(r.requester_id === user.id ? r.addressee_id : r.requester_id);
            }
            for (const r of pendingIncoming) {
                friendIds.add(r.requester_id);
            }
            for (const r of pendingOutgoing) {
                friendIds.add(r.addressee_id);
            }

            // 프로필 일괄 조회
            let profileMap = new Map<string, ProfileRow>();
            if (friendIds.size > 0) {
                const { data: profiles } = await supabase
                    .from("profiles")
                    .select("id, nickname, avatar_config")
                    .in("id", [...friendIds]);

                if (profiles) {
                    profileMap = new Map(profiles.map((p) => [p.id, p as ProfileRow]));
                }
            }

            // 친구 목록 빌드
            const friendList: FriendWithProfile[] = accepted
                .map((r) => {
                    const fid = r.requester_id === user.id ? r.addressee_id : r.requester_id;
                    const p = profileMap.get(fid);
                    if (!p) return null;
                    return {
                        friendshipId: r.id,
                        friendId: fid,
                        nickname: p.nickname,
                        avatarConfig: p.avatar_config,
                        since: r.created_at,
                    };
                })
                .filter((f): f is FriendWithProfile => f !== null);

            // 받은 요청 빌드
            const incoming: FriendRequest[] = pendingIncoming
                .map((r) => {
                    const p = profileMap.get(r.requester_id);
                    if (!p) return null;
                    return {
                        friendshipId: r.id,
                        userId: r.requester_id,
                        nickname: p.nickname,
                        avatarConfig: p.avatar_config,
                        createdAt: r.created_at,
                    };
                })
                .filter((f): f is FriendRequest => f !== null);

            const outgoing: FriendRequest[] = pendingOutgoing
                .map((r) => {
                    const p = profileMap.get(r.addressee_id);
                    if (!p) return null;
                    return {
                        friendshipId: r.id,
                        userId: r.addressee_id,
                        nickname: p.nickname,
                        avatarConfig: p.avatar_config,
                        createdAt: r.created_at,
                    };
                })
                .filter((f): f is FriendRequest => f !== null);

            setFriends(friendList);
            setIncomingRequests(incoming);
            setOutgoingRequests(outgoing);
        } catch {
            setFriends([]);
            setIncomingRequests([]);
            setOutgoingRequests([]);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        fetchFriends();
    }, [fetchFriends]);

    /** 닉네임으로 유저 검색 */
    const searchUsers = useCallback(
        async (query: string) => {
            if (!user || query.trim().length < 2) return [];
            const supabase = createClient();
            const { data } = await supabase
                .from("profiles")
                .select("id, nickname, avatar_config")
                .ilike("nickname", `%${query.trim()}%`)
                .neq("id", user.id)
                .limit(10);
            return (data ?? []) as ProfileRow[];
        },
        [user],
    );

    /** 친구 요청 보내기 */
    const sendRequest = useCallback(
        async (addresseeId: string) => {
            if (!user) return;
            const supabase = createClient();
            const { error } = await supabase
                .from("friendships")
                .insert({ requester_id: user.id, addressee_id: addresseeId });
            if (error) throw error;
            await fetchFriends();
        },
        [user, fetchFriends],
    );

    /** 요청 수락 */
    const acceptRequest = useCallback(
        async (friendshipId: number) => {
            if (!user) return;
            const supabase = createClient();
            const { error } = await supabase
                .from("friendships")
                .update({ status: "accepted" })
                .eq("id", friendshipId)
                .eq("addressee_id", user.id);
            if (error) throw error;
            await fetchFriends();
        },
        [user, fetchFriends],
    );

    /** 요청 거절 또는 친구 삭제 */
    const removeFriendship = useCallback(
        async (friendshipId: number) => {
            if (!user) return;
            const supabase = createClient();
            const { error } = await supabase
                .from("friendships")
                .delete()
                .eq("id", friendshipId);
            if (error) throw error;
            await fetchFriends();
        },
        [user, fetchFriends],
    );

    /** 특정 유저와의 관계 상태 확인 */
    const getFriendshipStatus = useCallback(
        (targetId: string): "none" | "pending-sent" | "pending-received" | "friends" => {
            if (friends.some((f) => f.friendId === targetId)) return "friends";
            if (incomingRequests.some((r) => r.userId === targetId)) return "pending-received";
            if (outgoingRequests.some((r) => r.userId === targetId)) return "pending-sent";
            return "none";
        },
        [friends, incomingRequests, outgoingRequests],
    );

    return {
        friends,
        incomingRequests,
        outgoingRequests,
        loading,
        searchUsers,
        sendRequest,
        acceptRequest,
        removeFriendship,
        getFriendshipStatus,
        refetch: fetchFriends,
    };
}
