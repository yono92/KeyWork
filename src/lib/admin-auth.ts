import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * API 라우트에서 admin role 검증.
 * admin이면 user_id 반환, 아니면 403 NextResponse 반환.
 */
export async function requireAdmin(): Promise<
    { userId: string } | NextResponse
> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json(
            { error: "인증이 필요합니다" },
            { status: 401 }
        );
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

    if (!profile || profile.role !== "admin") {
        return NextResponse.json(
            { error: "관리자 권한이 필요합니다" },
            { status: 403 }
        );
    }

    return { userId: user.id };
}

/** requireAdmin의 반환값이 에러 응답인지 확인 */
export function isAdminError(
    result: { userId: string } | NextResponse
): result is NextResponse {
    return result instanceof NextResponse;
}
