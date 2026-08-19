import type { ServerResponse } from "./types";

/**
 * Mirrors the shared 3-way error pattern used at every `GameManager`/
 * `GameLoader` HTTP call site (`RelayBetToBE`/`GetResults`/`SendResults`/
 * `ReAuthenticate`, spec §4): a connection failure gets a generic offline
 * message; anything else tries to read `.message` off a `ServerResponse`-
 * shaped body and falls back to a generic "unexpected server response"
 * string if that parse fails.
 */
export class ApiError extends Error {
  isConnectionError: boolean;
  constructor(message: string, isConnectionError = false) {
    super(message);
    this.name = "ApiError";
    this.isConnectionError = isConnectionError;
  }
}

async function toApiError(res: Response): Promise<ApiError> {
  try {
    const body = (await res.json()) as ServerResponse;
    return new ApiError(body.message || "Unexpected server response caused an exception.");
  } catch {
    return new ApiError("Unexpected server response caused an exception.");
  }
}

const CONNECTION_ERROR_MESSAGE =
  "Unable to contact the server. Please check your internet connection";

export async function getJson<T>(url: string, headers?: Record<string, string>): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { headers });
  } catch {
    throw new ApiError(CONNECTION_ERROR_MESSAGE, true);
  }
  if (!res.ok) throw await toApiError(res);
  return (await res.json()) as T;
}

export async function postForm<T>(
  url: string,
  fields: Record<string, string>,
  headers?: Record<string, string>,
): Promise<T> {
  const body = new URLSearchParams(fields);
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded", ...headers },
      body,
    });
  } catch {
    throw new ApiError(CONNECTION_ERROR_MESSAGE, true);
  }
  if (!res.ok) throw await toApiError(res);
  return (await res.json()) as T;
}
