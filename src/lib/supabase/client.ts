"use client";

import { createBrowserClient } from "@supabase/ssr";

// 빌드 시(SSG prerender) 환경변수 없을 수 있음 → 더미 값으로 fallback
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder";

export function createClient() {
    return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
