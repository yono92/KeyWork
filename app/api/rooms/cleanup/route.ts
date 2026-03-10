import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// 1시간 이상 된 방 정리
const ROOM_TTL_MS = 60 * 60 * 1000;

export async function POST() {
    const supabase = await createClient();
    const cutoff = new Date(Date.now() - ROOM_TTL_MS).toISOString();

    const { error } = await supabase
        .from("rooms")
        .delete()
        .lt("created_at", cutoff);

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
}
