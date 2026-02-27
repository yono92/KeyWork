import { NextResponse } from "next/server";

export type ApiErrorCode =
    | "TIMEOUT"
    | "NETWORK"
    | "UPSTREAM_4XX"
    | "UPSTREAM_5XX"
    | "INVALID_RESPONSE"
    | "CONFIG_MISSING"
    | "BAD_REQUEST";

export class ApiRequestError extends Error {
    code: ApiErrorCode;
    status: number;

    constructor(message: string, code: ApiErrorCode, status: number) {
        super(message);
        this.name = "ApiRequestError";
        this.code = code;
        this.status = status;
    }
}

export const jsonError = (
    message: string,
    code: ApiErrorCode,
    status: number,
    source: string
) => {
    return NextResponse.json(
        {
            error: message,
            errorCode: code,
            source,
        },
        { status }
    );
};

const delay = (ms: number): Promise<void> =>
    new Promise((resolve) => setTimeout(resolve, ms));

export async function fetchWithTimeoutRetry(
    input: string,
    init: RequestInit,
    options: { timeoutMs: number; retries?: number; retryDelayMs?: number }
): Promise<Response> {
    const retries = options.retries ?? 0;
    const retryDelayMs = options.retryDelayMs ?? 150;
    let lastError: ApiRequestError | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), options.timeoutMs);

        try {
            const response = await fetch(input, { ...init, signal: controller.signal });
            clearTimeout(timer);

            if (!response.ok) {
                if (response.status >= 500) {
                    throw new ApiRequestError(
                        "upstream server error",
                        "UPSTREAM_5XX",
                        502
                    );
                }
                throw new ApiRequestError(
                    "upstream request rejected",
                    "UPSTREAM_4XX",
                    502
                );
            }

            return response;
        } catch (error) {
            clearTimeout(timer);

            if (error instanceof ApiRequestError) {
                lastError = error;
            } else if (error instanceof DOMException && error.name === "AbortError") {
                lastError = new ApiRequestError("request timeout", "TIMEOUT", 504);
            } else {
                lastError = new ApiRequestError("network request failed", "NETWORK", 502);
            }

            if (attempt < retries) {
                await delay(retryDelayMs * (attempt + 1));
                continue;
            }

            throw lastError;
        }
    }

    throw lastError ?? new ApiRequestError("network request failed", "NETWORK", 502);
}

export const pruneCache = <T>(
    cache: Map<string, T & { expiresAt: number }>,
    maxEntries: number
): void => {
    const now = Date.now();

    for (const [key, value] of cache.entries()) {
        if (value.expiresAt <= now) {
            cache.delete(key);
        }
    }

    while (cache.size > maxEntries) {
        const first = cache.keys().next();
        if (first.done) break;
        cache.delete(first.value);
    }
};
