export type ClientFetchErrorCode = "TIMEOUT" | "NETWORK";

export class ClientFetchError extends Error {
    code: ClientFetchErrorCode;

    constructor(message: string, code: ClientFetchErrorCode) {
        super(message);
        this.name = "ClientFetchError";
        this.code = code;
    }
}

const DEFAULT_TIMEOUT_MS = 4500;

export async function fetchWithClientTimeout(
    input: RequestInfo | URL,
    init: RequestInit = {},
    timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
    const externalSignal = init.signal;

    const abortFromExternalSignal = () => controller.abort();

    if (externalSignal) {
        if (externalSignal.aborted) {
            controller.abort();
        } else {
            externalSignal.addEventListener("abort", abortFromExternalSignal, { once: true });
        }
    }

    try {
        return await fetch(input, { ...init, signal: controller.signal });
    } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
            throw new ClientFetchError("client request timeout", "TIMEOUT");
        }

        throw new ClientFetchError("client request failed", "NETWORK");
    } finally {
        window.clearTimeout(timeoutId);
        externalSignal?.removeEventListener("abort", abortFromExternalSignal);
    }
}
