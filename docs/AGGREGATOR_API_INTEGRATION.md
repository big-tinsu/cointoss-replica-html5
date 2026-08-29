# Coin Toss — Aggregator API Reference

Reverse-engineered from the Unity WebGL client (`Assets/Scripts/`) at commit `87da018`.
This is the contract the **Vite/React port** must reproduce. Every endpoint, payload shape,
encryption rule, ordering constraint and aggregator quirk below is what the live backend
currently expects.

| Source of truth | File |
| --- | --- |
| Boot / token / auth / replay | [GameLoader.cs](../Assets/Scripts/GameLoader.cs) |
| Bet, results, settle, re-auth | [GameManager.cs](../Assets/Scripts/GameManager.cs) |
| Bet history | [CoinTossBetHistoryManager.cs](../Assets/Scripts/CoinTossBetHistoryManager.cs) |
| Payload crypto | [Crypto.cs](../Assets/Scripts/Crypto.cs) |
| i18n service | [Lang/LanguageManager.cs](../Assets/Scripts/Lang/LanguageManager.cs) |
| Host-page event bridge | [EventManager.cs](../Assets/Scripts/EventManager.cs) |
| Wire models | [Data Structures/](../Assets/Scripts/Data%20Structures/) |

---

## 1. Concepts in one page

The game is a **thin client over a server-authoritative round**. The client never decides an
outcome; it asks the server for one and animates it.

- **Two-layer identity.** A short-lived **JWT** (`Authorization: Bearer …`) authorises HTTP
  calls. A **`sessionId`** identifies the *round context* and **rotates on every
  authenticate call**. Sending a stale `sessionId` is the single most common integration bug.
- **Encrypted envelopes.** Most request bodies and most response `data` fields are
  AES-128-CBC hex blobs, not JSON. See [§2](#2-payload-encryption).
- **Dynamic base URL.** Only the *token* endpoint is hardcoded. Everything else lives under a
  partner-specific base URL that arrives (encrypted) inside the token response.
- **Balance is only truthful right after an authenticate.** Between bet and settlement the
  client shows a locally-adjusted figure. See [§6](#6-balance-state-machine).
- **`x-www-form-urlencoded`, not JSON.** Every POST except replay is a form post
  (Unity `WWWForm`). Keep it that way — the backend parses form fields.

### Round lifecycle

```
launch URL ──▶ POST /partner/agg/token        → JWT + encrypted { data, patnerUrl, customization }
             │
             ├─ (jelly only) fetch sessionId from partner JS  ──┐
             ▼                                                  ▼
           POST bet-placed/agg-authenticate  ← initialRound=true, session_id?
             │   → balance, currency, sessionId, odds, limits, openRound
             │
             ├─ openRound != null ─▶ POST agg-manual-actions ─▶ re-authenticate (silent settle)
             ▼
           POST bet-placed/agg-place-bet      ← { sessionId, difficulties, amountPlaced, selection }
             │   (debits the wallet; returns no outcome)
             ▼
           POST bet-placed/agg-actions        ← { sessionId, selection }
             │   → event[0].{ won, generatedOutcome, cashoutAmount, odds }
             ▼
           play coin animation for the returned outcome
             ▼
           POST bet-placed/agg-authenticate   ← initialRound=false   (settles + refreshes balance)
             │   → new sessionId, authoritative balance
             ▼
           GET  /api/v1/bet-placed/partner/user/{sessionId}/{gameType}   (history refresh)
```

> **Why two calls to place one bet.** `agg-place-bet` debits and opens the round;
> `agg-actions` resolves it. They are deliberately separate so a network failure between them
> leaves a recoverable `openRound` that the next authenticate reports.

---

## 2. Payload encryption

`Crypto.cs` → AES-128-CBC, PKCS#7, **uppercase hex** (no Base64, no IV prefix).

| Parameter | Value |
| --- | --- |
| Algorithm | `AES-128-CBC` |
| Key | UTF-8 bytes of `"1234567890poiuyi"` (first 16 chars of `1234567890poiuyioii`) |
| IV | hex-decoded `76d7c69d097c5689fd0622c33433b5de` (16 bytes) |
| Padding | PKCS#7 (.NET `AesManaged` default) |
| Encoding | Uppercase hex string, `-` stripped |

> ⚠️ **Security note, carried over as-is.** The key and IV are static and shipped in the
> client, so this is obfuscation, not confidentiality — and a fixed IV makes identical
> plaintexts produce identical ciphertexts. The React port must match it to stay compatible
> with the current backend, but treat it as an encoding scheme and never as a trust boundary.
> If the backend is ever revised, move to a per-session key/IV negotiated server-side.

```ts
// src/lib/crypto.ts — WebCrypto, browser-native, no deps
const KEY_RAW = new TextEncoder().encode("1234567890poiuyi");
const IV = Uint8Array.from(
  "76d7c69d097c5689fd0622c33433b5de".match(/.{2}/g)!.map((b) => parseInt(b, 16)),
);

let keyPromise: Promise<CryptoKey> | null = null;
const key = () =>
  (keyPromise ??= crypto.subtle.importKey("raw", KEY_RAW, "AES-CBC", false, [
    "encrypt",
    "decrypt",
  ]));

const toHex = (buf: ArrayBuffer) =>
  [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();

const fromHex = (hex: string) =>
  Uint8Array.from(hex.match(/.{2}/g)!.map((b) => parseInt(b, 16)));

export async function encrypt(plain: string): Promise<string> {
  const out = await crypto.subtle.encrypt(
    { name: "AES-CBC", iv: IV },
    await key(),
    new TextEncoder().encode(plain),
  );
  return toHex(out);
}

export async function decrypt(cipherHex: string): Promise<string> {
  const out = await crypto.subtle.decrypt(
    { name: "AES-CBC", iv: IV },
    await key(),
    fromHex(cipherHex),
  );
  return new TextDecoder().decode(out);
}
```

**What is and isn't encrypted:**

| Field | Encrypted? |
| --- | --- |
| `url` (token request) | ✅ encrypt the full launch href |
| `data` (place-bet / actions / manual-actions request) | ✅ encrypt the JSON payload |
| `data` (authenticate request) | ❌ **pass through verbatim** — it is already the ciphertext from `meta.data` |
| `gameType`, `initialRound`, `session_id` | ❌ plain form fields |
| `response.data` (auth, actions) | ✅ decrypt → JSON |
| `response.meta.data` / `.patnerUrl` / `.customization` | ✅ decrypt → JSON / string / JSON |
| `response.message` | ❌ plain text |
| Bet history, replay, language responses | ❌ plain JSON end-to-end |

---

## 3. Environments & base URLs

`GameLoader.environment` is an inspector enum; in React make it a Vite env var
(`VITE_ENV=staging|production`).

| Purpose | production | staging |
| --- | --- | --- |
| **Token** | `https://portal.shacksevo.co/api/v2/partner/agg/token` | `https://game.shacksevo.co/user/api/v2/partner/agg/token` |
| **Replay** | `https://portal.shacksevo.co/api/v2/` | `https://game.shacksevo.co/game/api/v2/` |
| **Language** | `https://game.shacksevo.co/lang/api/v1/` | same (not env-switched) |
| **Game API** | `decrypt(meta.patnerUrl) + "/api/v2/"` | same derivation |
| **Bet history** | `decrypt(meta.patnerUrl) + "/api/v1/"` | same derivation |

Keep both derived values in state — the code calls them `baseUrl` (v2, game actions) and
`mainUrlBase` (raw partner root, used to build the v1 history URL). **History is v1; every
other game call is v2.**

---

## 4. Launch URL parameters

The client reads `window.location.search`. Only four params are interpreted locally; the
**entire href** is encrypted and posted to the token endpoint, so any additional partner
params reach the backend untouched.

| Param | Type | Meaning |
| --- | --- | --- |
| `language` | ISO code, default `en` | Selects the translation set. Unknown code → falls back to `en` with a warning banner. |
| `replayMode` | `"true"` \| `"false"` | Enters read-only replay. Requires `roundId`, and **skips token + auth entirely**. |
| `roundId` | string | Round to replay. Missing while `replayMode=true` → fatal error. |
| `apiAddress` | URL (may be percent-encoded) | **Jelly only.** Host of the partner session service. Normalised: URL-decoded, `https://` prefixed if schemeless, trailing `/` enforced. |

**Before encrypting the href for the token call, strip `replayMode` and `roundId`**
(`GameLoader.StripKey`) — the backend rejects a launch URL carrying replay params.

```ts
const stripKeys = (href: string, keys: string[]) => {
  const u = new URL(href);
  keys.forEach((k) => u.searchParams.delete(k));
  return u.toString();
};
const tokenHref = stripKeys(window.location.href, ["replayMode", "roundId"]);
```

---

## 5. Endpoints

### 5.1 `POST {tokenUrl}` — exchange launch URL for a JWT

Unauthenticated. `Content-Type: application/x-www-form-urlencoded`.

**Request**

| Field | Value |
| --- | --- |
| `url` | `encrypt(tokenHref)` — full launch URL, minus `replayMode`/`roundId` |

**Response** — `ServerResponse`

```ts
interface ServerResponse {
  status: boolean;
  data: string;      // the JWT (plain)
  message: string;
  meta?: {
    patnerUrl?: string;      // encrypted partner base URL (note the backend's spelling)
    data?: string;           // encrypted AggregatorData — pass through to authenticate
    customization?: string;  // encrypted ComponentData[]
    playerId?: string;
    aggregatorResponse?: string;
  };
}

interface AggregatorData {   // = JSON.parse(decrypt(meta.data))
  name: string;              // "pariplay" | "jelly" | "uplatform" | …  (lowercase compare)
  id: string;
  server: string;
  type: string;
  aggregator: string;
  mode: string;              // "demo" ⇒ play-money balance handling
  data: Record<string, unknown>;
}

interface ComponentData {    // = JSON.parse(decrypt(meta.customization))
  _id: string; name: string; value: string; type: string;
  partnerId: string; createdAt: string; updatedAt: string;
}
```

**Client must derive and store**

```ts
authorizationToken = res.data;
rawAggData         = res.meta.data;                       // keep the CIPHERTEXT
aggregator         = JSON.parse(decrypt(res.meta.data));
isDemo             = aggregator.mode === "demo";
mainUrlBase        = decrypt(res.meta.patnerUrl);
baseUrl            = mainUrlBase + "/api/v2/";
customization      = JSON.parse(decrypt(res.meta.customization));  // optional
```

**Failure modes** — missing `data` / `meta.data` / `meta.patnerUrl` are each fatal with a
distinct message; a non-2xx carries `{ message }` in plain JSON; a transport failure is
"check your internet connection".

---

### 5.2 `POST {baseUrl}bet-placed/agg-authenticate` — authenticate / settle / refresh

The workhorse. Called at boot **and again after every resolved round** — it is what settles
the round on the wallet and returns the authoritative balance plus a fresh `sessionId`.

`Authorization: Bearer {jwt}` · form-encoded.

**Request**

| Field | Value |
| --- | --- |
| `data` | **the raw ciphertext** from `meta.data` — do **not** re-encrypt |
| `gameType` | `"cointoss"` |
| `initialRound` | `"true"` on first call, `"false"` on every subsequent call (lowercase string) |
| `session_id` | Jelly only — the sessionId scraped from the partner session service |

**Response** — `ServerResponse` whose `data` decrypts to:

```ts
interface AuthData { data: LoginData }

interface LoginData {
  username: string;
  sessionId: string;          // ROTATES — always overwrite local state
  balance: string;            // decimal string, parse with invariant culture
  currency: string;           // e.g. "NGN"
  odds: { "1": number };      // payout multiplier for a correct call
  openRound: OpenRound | null;
  aggregatorCurrency: { minimum: number; maximum: number };  // stake limits
}

interface OpenRound {
  _id: string; userId: string; gameType: string; username: string;
  type: string; partnerId: string; gameRoundId: string; betPlacedType: string;
  selection: string; selectedEventType: string[];
  amountPlaced: number; cashoutAmount: number; potentialWinning: number;
  playerDetails: Record<string, unknown>;
  createdAt: string; updatedAt: string;
}
```

**`openRound` recovery.** If it is non-null on boot, the player left mid-round. Take
`cashoutAmount` from it, `POST agg-manual-actions` (§5.5), then re-authenticate — and suppress
the win/lose result panel for that cycle (the Unity client sets a `cashOut` flag for exactly
this).

**`initialRound` is one-way.** It flips to `false` before the first re-auth and never returns
to `true` for the life of the session.

---

### 5.3 `POST {baseUrl}bet-placed/agg-place-bet` — open the round

Debits the wallet. Returns **no outcome** — success only means the stake was accepted.

`Authorization: Bearer {jwt}` · form-encoded.

| Field | Value |
| --- | --- |
| `data` | `encrypt(JSON.stringify(payload))` |

```ts
interface PlaceBetPayload {
  sessionId: string;
  difficulties: "none";           // literal; reserved for other games in the family
  amountPlaced: number;           // rounded to 2 dp — the backend rejects more
  selection: "head" | "tail";
}
```

On success the Unity client immediately chains into `agg-actions` (§5.4). On failure it shows
`response.message` and re-enables the bet controls — **and for `uplatform` it additionally
fires a re-authenticate** to resync the wallet (§7.3).

---

### 5.4 `POST {baseUrl}bet-placed/agg-actions` — resolve the round

Returns the outcome to animate.

`Authorization: Bearer {jwt}` · form-encoded.

| Field | Value |
| --- | --- |
| `data` | `encrypt(JSON.stringify({ sessionId, selection }))` |

**Response** — `ServerResponse.data` decrypts to:

```ts
interface BetData { data: { event: OutcomeResult[] } }   // note: lowercase "event"

interface OutcomeResult {
  level: number;
  betTime: string;            // ISO-8601
  processedTime: string;      // ISO-8601
  selection: string;          // what the player picked: "head" | "tail"
  won: string;                // "true" | "false"  ← STRING, not boolean
  generatedOutcome: string;   // what the coin did: "head" | "tail" | "side"
  odds: number;
  amount: number;
  cashoutAmount: number;      // gross return; 0 on a loss
}
```

Only `event[0]` is read. `generatedOutcome` drives the animation; a **`side`** landing is
always a loss even though the player can only ever pick head or tail.

Post-success client work, in order: set outcome, subtract stake locally, refresh balance UI,
mark `hasMadeABet`, hide bet panel, play the animation for `generatedOutcome`, and only when
the animation ends call `agg-authenticate` (§5.2).

---

### 5.5 `POST {baseUrl}bet-placed/agg-manual-actions` — settle an abandoned round

Used solely for `openRound` recovery. `Authorization: Bearer {jwt}` · form-encoded.

| Field | Value |
| --- | --- |
| `data` | `encrypt(JSON.stringify({ sessionId }))` |

On success, set the "silent settle" flag and re-authenticate. On failure, surface
`response.message` and offer a retry — the Unity client shows a dedicated cashout-retry panel
whose only action is another `agg-authenticate`.

---

### 5.6 `GET {mainUrlBase}/api/v1/bet-placed/partner/user/{sessionId}/{gameType}` — bet history

Note the **v1** path. `Authorization: Bearer {jwt}`.

| Query | Value |
| --- | --- |
| `aggregator` | `true` |
| `limit` | `20` |
| `page` | 1-based page number |

```ts
interface HistoryResponse {
  status: string;
  message: string;
  data: {
    bet: {
      data: BetRecordData[];
      pagination: { to: number; from: number; totalPages: number;
                    total: number; limit: number; currentPage: number };
    };
  };
}

interface BetRecordData {
  gameType: string;
  username: string;
  result: "won" | "lost" | "pending";
  amountPlaced: number;
  cashoutAmount: number;
  selectedEventType: OutcomeResult[] | null;   // ⚠ polymorphic — see below
}
```

Two quirks the Unity client works around, both of which the React port needs:

1. **`selectedEventType` is polymorphic.** For some rows it is an array of *objects*
   (`OutcomeResult[]`); for others an array of *strings or numbers*. Treat any non-object
   array as `null` and skip the row.
   ```ts
   const events = Array.isArray(raw) && raw.length > 0 && typeof raw[0] === "object"
     ? (raw as OutcomeResult[]) : null;
   ```
2. **`betTime` is ISO-8601**, not `MM/dd/yyyy HH:mm:ss` as an older backend sent. Parse as ISO
   and render `dd/MM/yyyy`; fall back to the raw string if parsing fails.

Advance the "current page" pointer **only after a successful response**, and guard against
concurrent requests. There is no total-page check before paging forward, so an over-run page
simply returns an empty list.

---

### 5.7 `POST {replayBase}bet-placed/replay` — replay a finished round

The one **JSON** endpoint, and the one with **no `Authorization` header**. Entered via
`?replayMode=true&roundId=…`, it fully replaces the token+auth path.

`Content-Type: application/json` · body `{ "roundId": "..." }`

```ts
interface ReplayResponse {
  status: boolean;
  message: string;
  data: {
    authStage: {
      balance: number;         // NUMBER here (a string in LoginData)
      username: string;
      sessionId: string;
      currency: string;
      odds: { "1": number };
      aggregatorCurrency: { minimum: number; maximum: number };
    };
    betStage: {};              // currently empty; populated per-game later
    cashoutStage: { event: ReplayEvent[] };
  };
}

interface ReplayEvent {
  won: string; odds: number; level: number; amount: number;
  betTime: string; outcome: string; selection: string;
  cashoutAmount: number; processedTime: string;
  mainBetCashout: string; generatedOutcome: string;
}
```

In replay the UI is read-only: no betting, no history, no wallet mutation.

---

### 5.8 Language service

Not env-switched — always `https://game.shacksevo.co/lang/api/v1/`. No auth.

| Call | Response |
| --- | --- |
| `GET languages` | `{ data: Record<code, languageName>, message }` |
| `GET languages/{code}?texts=<JSON array of strings>` | `{ data: string[], message }` — **positionally aligned with the request array** |

The client keeps a dictionary of every English UI string, posts all keys at once, and maps the
returned array back by index. `code === "en"` short-circuits with no network call. Empty or
whitespace-only translations fall back to the source string; non-empty ones are capitalised on
the first character.

```ts
const url = `${LANG_BASE}languages/${code}?texts=${encodeURIComponent(JSON.stringify(keys))}`;
```

> The `texts` array carries ~110 keys, which makes for a long query string. In React, prefer
> shipping static JSON locale files and using this service only for **server-originated**
> strings (error messages), which is already what the single-string `Translate` path does.
> Cache per-locale results; the dictionary is stable for a session.

Unknown keys must **not** throw — fall back to the raw string and memoise it.

---

## 6. Balance state machine

The displayed balance is not always the server's balance. Reproducing this exactly matters, or
the UI will flicker or show a stale figure for a full round.

| Moment | What happens to the displayed balance |
| --- | --- |
| After `agg-authenticate` (real money) | `balance = Number(loginData.balance)` — **authoritative** |
| After `agg-authenticate` (demo, `mode === "demo"`) | `balance += cashoutAmount` locally; the server figure is **ignored** |
| After `agg-actions` succeeds | `balance -= amountPlaced` locally (optimistic debit) |
| Between bet and settlement | Locally adjusted — do not re-fetch |

Formatting: `"0.##"` with invariant culture, prefixed by `currency`. Parse `balance` with
`Number()`/decimal-safe parsing and never with locale-aware parsing — the backend always sends
`.` as the decimal separator.

Stake constraints come from `aggregatorCurrency.minimum` / `.maximum`; the stake is clamped
client-side and rounded to 2 dp before `agg-place-bet` ("You cannot place bet above 2 decimal
place" is a server-side rejection).

---

## 7. Aggregator-specific integrations

`aggregator.name` (from the decrypted `meta.data`) selects the behaviour. Compare
case-insensitively — the Unity code is inconsistent about it.

### 7.1 Pariplay — host-page event bridge

Pariplay expects lifecycle notifications on the **parent page**. Unity dispatches a
`CustomEvent` on `window` with a JSON string in `detail`; in React, call the same bridge (or
`window.parent.postMessage`, if the host has since moved to it — confirm before switching).

```ts
const dispatch = (type: string, payload?: object) =>
  window.dispatchEvent(
    new CustomEvent(type, { detail: JSON.stringify({ type, ...payload }) }),
  );
```

| Event | Fired when | Payload |
| --- | --- | --- |
| `onAppFrameReady` | token response parsed, aggregator identified | `{ type }` |
| `gameDataLoaded` | `agg-authenticate` succeeded | `{ type }` |
| `gameReady` | ~1 s after auth, game interactive | `{ type }` |
| `roundStart` | player presses bet, **before** `agg-place-bet` | `{ type, data: { totalBet } }` |
| `ticketReceived` | `agg-place-bet` succeeded | `{ type }` |
| `balance` | after `agg-actions`, post local debit | `{ type, data: { amount } }` |
| `roundStarted` | immediately after `balance` | `{ type }` |
| `roundEnded` | `agg-authenticate` (settlement) succeeded | `{ type }` |
| `quit` | page unload | `{ type }` |

The inbound direction is symmetrical: the host dispatches `stopAutobet`, `pause` or `resume`
on `window` and the client listens. **These three are registered but unimplemented in the
Unity client** — the handler bodies are empty. The React port should either implement them or
consciously keep them as no-ops.

### 7.2 Jelly — scraped session id

Jelly does not hand the session id to the game directly; the Unity client injects the
partner's `JellyApiLoader.js` and monkey-patches `fetch` and `XMLHttpRequest` to intercept the
response of `sessionhandler/getsession.php`, extracting `<sessionId>` from the XML.

```
apiAddress (query param) → decode, force https, ensure trailing "/"
  → inject <script src="{apiAddress}gamehandler/1/JellyApiLoader.js">
  → intercept fetch + XHR for "sessionhandler/getsession.php"
  → parse XML, read <sessionId>
  → restore the original fetch/XHR   ← important, patch is one-shot
  → POST agg-authenticate with session_id=<sessionId>
```

Constraints carried over from the Unity implementation:

- **Authenticate is deferred.** Under Jelly, the boot sequence *stops* after the token call
  and only resumes when the session id arrives. Missing `apiAddress` is fatal.
- **Strictly one-shot.** Guard with `sessionReceived || authenticating || authenticated` — the
  interceptor can fire more than once and a double authenticate rotates the `sessionId` out
  from under the round.
- **Restore the originals** as soon as the id is captured, so the patch never leaks into game
  traffic.
- The loader's `#JellyPreloadManager` element is hidden ~1 s after injection.
- `session_id` must be sent on **every** subsequent `agg-authenticate`, not just the first.

> In React this is far cleaner as a dedicated module that returns a `Promise<string>` and
> tears its own interceptors down in a `finally`. Keep the one-shot guard.

### 7.3 uPlatform — forced resync on error

For `uplatform`, **any** failed game call (`agg-place-bet`, `agg-actions`,
`agg-manual-actions`, or a failed `agg-authenticate`) triggers an extra `agg-authenticate` to
resync the wallet. That recovery auth must **suppress the win/lose panel** — the Unity client
uses an `isUplatformError` flag that is consumed by the next auth response. Without the
suppression the player sees a phantom result for a round that never resolved.

---

## 8. Error handling contract

Three distinct classes, and the client treats them differently:

| Class | Detection | Handling |
| --- | --- | --- |
| Transport | request never completed | *"Unable to contact the server. Please check your internet connection"*; re-enable controls |
| HTTP error | non-2xx with a body | `JSON.parse(body).message` → localise → toast |
| Malformed | body isn't parseable `ServerResponse` | *"Unexpected server response caused an exception."* |

During boot these are **fatal** (full-screen error panel, red outline, game does not start).
In-round they are **transient** (2 s toast, controls restored). Language failures are
**warnings** only — yellow outline, game continues in English.

Every message is looked up in the translation dictionary first and falls back to the raw
string. Server-side messages the backend is known to return (all appear in the dictionary and
should be translated, not shown raw):

```
Error processing your request            You no longer have access to the game
Invalid Aggregator                       Invalid Partner
You cannot place bet above 2 decimal place
Error debitting your wallet              Session Exipired            (sic)
You've no ongoing round. Kindly reload!  Bet already closed. Kindly reload the game
Invalid Operation. Kindly reload the game.
Bet placed successfully
```

Notification toasts must **queue**, not overlap — the Unity client keeps a FIFO and shows each
for 2 s.

---

## 9. Suggested React shape

A thin, typed transport layer plus one state machine keeps the ordering constraints honest.

```
src/
  lib/crypto.ts            encrypt / decrypt (WebCrypto, §2)
  api/client.ts            postForm / postJson / get + error normalisation (§8)
  api/endpoints.ts         token, authenticate, placeBet, actions, manualActions,
                           history, replay, languages
  api/types.ts             every interface in this document
  game/useGameSession.ts   boot → auth → bet → resolve → settle state machine (§1)
  game/useBalance.ts       the §6 balance rules, isolated
  aggregators/pariplay.ts  event bridge (§7.1)
  aggregators/jelly.ts     session scraper, returns Promise<string> (§7.2)
  aggregators/uplatform.ts error-resync policy (§7.3)
```

```ts
// api/client.ts — form posts, because the backend parses form fields
export async function postForm<T>(
  url: string,
  fields: Record<string, string>,
  token?: string,
): Promise<T> {
  const body = new URLSearchParams(fields);
  const res = await fetch(url, {
    method: "POST",
    body,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  }).catch(() => {
    throw new TransportError(
      "Unable to contact the server. Please check your internet connection",
    );
  });

  const text = await res.text();
  if (!res.ok) {
    try {
      throw new ApiError((JSON.parse(text) as ServerResponse).message);
    } catch {
      throw new ApiError("Unexpected server response caused an exception.");
    }
  }
  return JSON.parse(text) as T;
}
```

**Non-negotiable ordering rules for the port:**

1. `sessionId` is replaced on **every** authenticate response — read it from state, never
   close over it.
2. `initialRound` is `true` exactly once per session.
3. `agg-actions` is only ever called after a successful `agg-place-bet`.
4. Settlement (`agg-authenticate`) fires only after the outcome animation completes — settling
   early spoils the reveal, and the balance jump is what the player reads as the result.
5. One in-flight game call at a time. The Unity client gates on a single
   `isAttemptingServerCallBack` flag; an `AbortController` plus a status enum is the React
   equivalent.
6. Refresh bet history (page 1) after each settled round.

**Things worth fixing rather than porting verbatim:**

- The coin animation length is read from the Animator with a 5 s fallback; in React drive the
  reveal from an explicit, single source of truth for duration.
- `PlayerPrefs.DeleteAll()` on boot wipes *all* local state including the language choice —
  scope `localStorage` clearing to this game's keys instead.
- Stake is persisted under two different keys (`ctstake` on read, `stbstake` on write) in the
  Unity client, so the persisted stake never actually round-trips. Pick one key.
- The free-bet promotion (`VirtualCashManager`) is entirely client-side and stored in
  `PlayerPrefs` — it grants a free stake after 10 rounds / 500 total staked, with no server
  validation. Do not carry this to React without a server-side counterpart.

---

## 10. Quick reference

| # | Method | Path | Auth | Body | Encrypted |
| --- | --- | --- | --- | --- | --- |
| 5.1 | POST | `{tokenUrl}` | — | form `url` | req ✅ / res `data`+`meta` ✅ |
| 5.2 | POST | `{baseUrl}bet-placed/agg-authenticate` | Bearer | form `data`,`gameType`,`initialRound`,`session_id?` | req ❌ (pass-through) / res ✅ |
| 5.3 | POST | `{baseUrl}bet-placed/agg-place-bet` | Bearer | form `data` | req ✅ / res ❌ |
| 5.4 | POST | `{baseUrl}bet-placed/agg-actions` | Bearer | form `data` | req ✅ / res ✅ |
| 5.5 | POST | `{baseUrl}bet-placed/agg-manual-actions` | Bearer | form `data` | req ✅ / res ❌ |
| 5.6 | GET | `{mainUrlBase}/api/v1/bet-placed/partner/user/{sessionId}/{gameType}` | Bearer | — | ❌ |
| 5.7 | POST | `{replayBase}bet-placed/replay` | — | JSON `{roundId}` | ❌ |
| 5.8 | GET | `{langBase}languages` · `languages/{code}?texts=[…]` | — | — | ❌ |

**Constants:** `gameType = "cointoss"` · `difficulties = "none"` · `selection ∈ {head, tail}` ·
`generatedOutcome ∈ {head, tail, side}` · history `limit = 20`.

---

## 11. Open questions for the backend team

Answer these before the React port goes live — each one is a guess the Unity client currently
gets away with:

1. Is `agg-place-bet` idempotent per `sessionId`? A retry after a timeout could otherwise
   double-debit.
2. What is the JWT lifetime, and is there a refresh path, or is a full re-launch the only
   recovery from expiry?
3. `meta.patnerUrl` — is the misspelling stable, or is a corrected `partnerUrl` coming?
4. Under what conditions does history's `selectedEventType` return strings instead of objects?
5. Is the `side` outcome weighted by a server config the client should display?
6. Does `betStage` in the replay payload have a planned schema for cointoss?
