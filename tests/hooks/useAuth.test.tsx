import { act, renderHook, waitFor } from "@testing-library/react";
import type { User } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "../../src/hooks/useAuth";

const mocks = vi.hoisted(() => {
    let authCallback: ((event: string, session: unknown) => void | Promise<void>) | null = null;

    const single = vi.fn();
    const eq = vi.fn(() => ({ single }));
    const select = vi.fn(() => ({ eq }));
    const upsert = vi.fn();
    const insert = vi.fn();
    const updateEq = vi.fn();
    const update = vi.fn(() => ({ eq: updateEq }));
    const from = vi.fn(() => ({ select, upsert, insert, update }));

    const getSession = vi.fn();
    const getUser = vi.fn();
    const signOut = vi.fn();
    const signInWithPassword = vi.fn();
    const signUp = vi.fn();
    const unsubscribe = vi.fn();
    const onAuthStateChange = vi.fn((callback: (event: string, session: unknown) => void | Promise<void>) => {
        authCallback = callback;
        return { data: { subscription: { unsubscribe } } };
    });

    const mockSupabase = {
        auth: {
            getSession,
            getUser,
            onAuthStateChange,
            signOut,
            signInWithPassword,
            signUp,
        },
        from,
    };

    return {
        eq,
        from,
        getSession,
        getUser,
        insert,
        mockSupabase,
        onAuthStateChange,
        select,
        signOut,
        signUp,
        single,
        triggerAuth: async (event: string, session: unknown) => {
            if (authCallback) {
                await authCallback(event, session);
            }
        },
        unsubscribe,
        upsert,
    };
});

vi.mock("@/lib/supabase/client", () => ({
    createClient: () => mocks.mockSupabase,
}));

type Deferred<T> = {
    promise: Promise<T>;
    resolve: (value: T) => void;
    reject: (reason?: unknown) => void;
};

const createDeferred = <T,>(): Deferred<T> => {
    let resolve!: (value: T) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
    });

    return { promise, resolve, reject };
};

const createUser = (): User => ({
    app_metadata: {},
    aud: "authenticated",
    created_at: "2026-03-12T00:00:00.000Z",
    email: "player@example.com",
    id: "user-1",
    role: "authenticated",
    updated_at: "2026-03-12T00:00:00.000Z",
    user_metadata: {},
} as User);

const createProfile = () => ({
    avatar_config: null,
    avatar_url: null,
    created_at: "2026-03-12T00:00:00.000Z",
    id: "user-1",
    nickname: "PlayerOne",
});

describe("useAuth", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(console, "warn").mockImplementation(() => {});
        mocks.getSession.mockResolvedValue({ data: { session: null }, error: null });
        mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
        mocks.signOut.mockResolvedValue({ error: null });
        mocks.single.mockResolvedValue({ data: null });
        mocks.insert.mockResolvedValue({ error: null });
        mocks.signUp.mockResolvedValue({ data: { user: null }, error: null });
        mocks.upsert.mockResolvedValue({ error: null });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it("restores the current session during initial mount", async () => {
        const user = createUser();
        const profile = createProfile();

        mocks.getSession.mockResolvedValue({
            data: { session: { user } },
            error: null,
        });
        mocks.getUser.mockResolvedValue({ data: { user }, error: null });
        mocks.single.mockResolvedValue({ data: profile });

        const { result } = renderHook(() => useAuth());

        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.user?.id).toBe(user.id);
        expect(result.current.profile).toEqual(profile);
        expect(mocks.getSession).toHaveBeenCalledTimes(1);
        expect(mocks.onAuthStateChange).toHaveBeenCalledTimes(1);
    });

    it("clears state on auth sign-out events", async () => {
        const user = createUser();
        const profile = createProfile();

        mocks.getSession.mockResolvedValue({
            data: { session: { user } },
            error: null,
        });
        mocks.getUser.mockResolvedValue({ data: { user }, error: null });
        mocks.single.mockResolvedValue({ data: profile });

        const { result } = renderHook(() => useAuth());

        await waitFor(() => expect(result.current.user?.id).toBe(user.id));

        await act(async () => {
            await mocks.triggerAuth("SIGNED_OUT", null);
        });

        expect(result.current.user).toBeNull();
        expect(result.current.profile).toBeNull();
        expect(result.current.loading).toBe(false);
    });

    it("hydrates from INITIAL_SESSION even if getSession is still pending", async () => {
        const user = createUser();
        const profile = createProfile();
        const deferredSession = createDeferred<{ data: { session: null }; error: null }>();

        mocks.getSession.mockReturnValue(deferredSession.promise);
        mocks.getUser.mockResolvedValue({ data: { user }, error: null });
        mocks.single.mockResolvedValue({ data: profile });

        const { result } = renderHook(() => useAuth());

        await act(async () => {
            await mocks.triggerAuth("INITIAL_SESSION", { user });
        });

        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.user?.id).toBe(user.id);
        expect(result.current.profile).toEqual(profile);

        deferredSession.resolve({ data: { session: null }, error: null });
        await act(async () => {
            await deferredSession.promise;
        });
    });

    it("keeps logout state even when an earlier session restore resolves later", async () => {
        const user = createUser();
        const profile = createProfile();
        const deferredProfile = createDeferred<{ data: ReturnType<typeof createProfile> | null }>();

        mocks.getSession.mockResolvedValue({
            data: { session: { user } },
            error: null,
        });
        mocks.getUser.mockResolvedValue({ data: { user }, error: null });
        mocks.single.mockReturnValueOnce(deferredProfile.promise);

        const { result } = renderHook(() => useAuth());

        await waitFor(() => expect(mocks.getSession).toHaveBeenCalledTimes(1));

        await act(async () => {
            await result.current.signOut();
        });

        expect(result.current.user).toBeNull();
        expect(result.current.profile).toBeNull();
        expect(result.current.loading).toBe(false);

        await act(async () => {
            deferredProfile.resolve({ data: profile });
            await deferredProfile.promise;
        });

        expect(result.current.user).toBeNull();
        expect(result.current.profile).toBeNull();
    });

    it("clears a stale cached session when getUser cannot verify it", async () => {
        const user = createUser();

        mocks.getSession.mockResolvedValue({
            data: { session: { user } },
            error: null,
        });
        mocks.getUser.mockResolvedValue({
            data: { user: null },
            error: new Error("Auth session missing"),
        });

        const { result } = renderHook(() => useAuth());

        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.user).toBeNull();
        expect(result.current.profile).toBeNull();
        expect(mocks.signOut).toHaveBeenCalledWith({ scope: "local" });
    });

    it("does not report logged-in UI state when profile hydration fails", async () => {
        const user = createUser();

        mocks.getSession.mockResolvedValue({
            data: { session: { user } },
            error: null,
        });
        mocks.getUser.mockResolvedValue({ data: { user }, error: null });
        mocks.single.mockRejectedValue(new Error("profile fetch failed"));

        const { result } = renderHook(() => useAuth());

        await waitFor(() => expect(result.current.loading).toBe(false));

        expect(result.current.user?.id).toBe(user.id);
        expect(result.current.profile).toBeNull();
        expect(result.current.isLoggedIn).toBe(false);
    });

    it("creates a fallback profile when signup profile creation fails", async () => {
        const user = createUser();

        mocks.signUp.mockResolvedValue({
            data: { user },
            error: null,
        });
        mocks.insert.mockResolvedValue({ error: new Error("duplicate key value violates unique constraint") });
        mocks.upsert.mockResolvedValue({ error: null });

        const { result } = renderHook(() => useAuth());

        await act(async () => {
            await result.current.signUp("player@example.com", "secret123", "PlayerOne");
        });

        expect(mocks.insert).toHaveBeenCalledWith({ id: user.id, nickname: "PlayerOne" });
        expect(mocks.upsert).toHaveBeenCalledWith(
            { id: user.id, nickname: "player_user-1" },
            { onConflict: "id" },
        );
    });
});
