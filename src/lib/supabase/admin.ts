import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "placeholder";

/**
 * service_role 키 기반 Supabase 클라이언트.
 * RLS를 우회하므로 반드시 서버 사이드(API 라우트)에서만 사용.
 * 타입 제네릭 없이 사용 — admin 클라이언트는 유연한 쿼리가 필요.
 */
export function createAdminClient() {
    return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
    });
}
