import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isAdminError } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
    const auth = await requireAdmin();
    if (isAdminError(auth)) return auth;

    const supabase = createAdminClient();
    const { data, error } = await supabase
        .from("game_config")
        .select("*")
        .order("game_mode");

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ configs: data ?? [] });
}

export async function PUT(request: NextRequest) {
    const auth = await requireAdmin();
    if (isAdminError(auth)) return auth;

    const body = await request.json() as {
        game_mode: string;
        config: Record<string, unknown>;
    };

    if (!body.game_mode || !body.config || typeof body.config !== "object") {
        return NextResponse.json({ error: "game_mode와 config 필수" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { error } = await supabase
        .from("game_config")
        .upsert({
            game_mode: body.game_mode,
            config: body.config,
            updated_at: new Date().toISOString(),
            updated_by: auth.userId,
        }, { onConflict: "game_mode" });

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
}
