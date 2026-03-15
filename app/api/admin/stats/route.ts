import { NextResponse } from "next/server";
import { requireAdmin, isAdminError } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
    const auth = await requireAdmin();
    if (isAdminError(auth)) return auth;

    const supabase = createAdminClient();

    const [usersRes, scoresRes, roomsRes] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("game_scores").select("id", { count: "exact", head: true }),
        supabase.from("rooms").select("id", { count: "exact", head: true }).eq("status", "waiting"),
    ]);

    return NextResponse.json({
        totalUsers: usersRes.count ?? 0,
        totalGames: scoresRes.count ?? 0,
        activeRooms: roomsRes.count ?? 0,
    });
}
