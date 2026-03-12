import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getRoomCutoffIso } from "@/lib/multiplayerRealtime";

export async function POST() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
        return NextResponse.json({ ok: true });
    }

    const cutoff = getRoomCutoffIso();

    const { error } = await supabase
        .from("rooms")
        .delete()
        .lt("created_at", cutoff);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
}
