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

/**
 * POST a JSON body.
 *
 * NOTE, deliberate divergence: `docs/AGGREGATOR_API_INTEGRATION.md` (§1, §5,
 * §10) specifies `application/x-www-form-urlencoded` for every POST but
 * replay, mirroring the Unity client's `WWWForm`. This port sends JSON
 * instead, as a maintainer-level decision — not an oversight.
 *
 * What is known: the mock accepts both (`express.json()` and
 * `express.urlencoded()` are both registered in `server/index.js`, and
 * `api/mock.js` normalises either shape), and probing the live token endpoint
 * found JSON and form encoding producing the identical response, while
 * `multipart/form-data` produced a different one — see README, "Previewing a
 * deploy with `?mock=1`".
 *
 * If a real aggregator call ever returns as though its fields were missing,
 * this is the first thing to switch back: pass `new URLSearchParams(fields)`
 * as the body and drop the explicit `Content-Type`, letting the browser set
 * it. The payloads are safe under form escaping either way — every encrypted
 * field is uppercase hex from `crypto.ts` (`[0-9A-F]`, no `+`/`=`) and the JWT
 * travels in the `Authorization` header, not the body.
 */
export async function postJson<T>(
  url: string,
  fields: Record<string, string>,
  headers?: Record<string, string>,
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", ...headers },
      body: JSON.stringify(fields),
    });
  } catch {
    throw new ApiError(CONNECTION_ERROR_MESSAGE, true);
  }
  if (!res.ok) throw await toApiError(res);
  return (await res.json()) as T;
}
