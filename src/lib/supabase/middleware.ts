import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({ request });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co",
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder",
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value),
                    );
                    supabaseResponse = NextResponse.next({ request });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options),
                    );
                },
            },
        },
    );

    // getUser()를 호출해야 JWT 토큰이 만료 전 자동 갱신됨
    const { data: { user } } = await supabase.auth.getUser();

    // /admin 경로 보호: 미인증 또는 admin이 아닌 유저 → 홈으로 리다이렉트
    if (request.nextUrl.pathname.startsWith("/admin")) {
        if (!user) {
            return NextResponse.redirect(new URL("/", request.url));
        }

        const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();

        if (!profile || profile.role !== "admin") {
            return NextResponse.redirect(new URL("/", request.url));
        }
    }

    return supabaseResponse;
}
