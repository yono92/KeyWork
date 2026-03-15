import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isAdminError } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
    const auth = await requireAdmin();
    if (isAdminError(auth)) return auth;

    const supabase = createAdminClient();
    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = 20;
    const status = searchParams.get("status") || "";

    let query = supabase
        .from("rooms")
        .select("id, game_mode, status, player1_id, player2_id, winner_id, created_at", { count: "exact" })
        .order("created_at", { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

    if (status) {
        query = query.eq("status", status);
    }

    const { data, count, error } = await query;

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
        rooms: data ?? [],
        total: count ?? 0,
        page,
        totalPages: Math.ceil((count ?? 0) / limit),
    });
}

export async function DELETE(request: NextRequest) {
    const auth = await requireAdmin();
    if (isAdminError(auth)) return auth;

    const { ids } = await request.json() as { ids: string[] };
    if (!Array.isArray(ids) || ids.length === 0) {
        return NextResponse.json({ error: "ids 배열 필수" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { error } = await supabase
        .from("rooms")
        .delete()
        .in("id", ids);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, deleted: ids.length });
}
