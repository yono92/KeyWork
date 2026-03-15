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
    const search = searchParams.get("search") || "";

    let query = supabase
        .from("profiles")
        .select("id, nickname, role, avatar_config, created_at", { count: "exact" })
        .order("created_at", { ascending: false })
        .range((page - 1) * limit, page * limit - 1);

    if (search) {
        query = query.ilike("nickname", `%${search}%`);
    }

    const { data, count, error } = await query;

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
        users: data ?? [],
        total: count ?? 0,
        page,
        totalPages: Math.ceil((count ?? 0) / limit),
    });
}

export async function PATCH(request: NextRequest) {
    const auth = await requireAdmin();
    if (isAdminError(auth)) return auth;

    const body = await request.json() as { userId: string; role: string };
    if (!body.userId || !["user", "admin"].includes(body.role)) {
        return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { error } = await supabase
        .from("profiles")
        .update({ role: body.role })
        .eq("id", body.userId);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}

export async function DELETE(request: NextRequest) {
    const auth = await requireAdmin();
    if (isAdminError(auth)) return auth;

    const { userId } = await request.json() as { userId: string };
    if (!userId) {
        return NextResponse.json({ error: "userId 필수" }, { status: 400 });
    }

    // 자기 자신은 삭제 불가
    if (userId === auth.userId) {
        return NextResponse.json({ error: "자기 자신은 삭제할 수 없습니다" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { error } = await supabase.auth.admin.deleteUser(userId);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
