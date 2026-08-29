# Coin Toss — Partner API Reference

Reverse-engineered from the Unity WebGL client in this repository (`Assets/Scripts`,
`Assets/Prefabs/Leaderboard`) and written as the integration contract for the
Vite/React port of the same game.

Everything here reflects what the shipped client actually sends and parses. Where the
backend is known to return more than the client reads, that is called out.

**Source map**

| Concern | Unity file |
|---|---|
| Boot, token, authenticate | `Assets/Scripts/GameLoader.cs` |
| Place bet / round lifecycle | `Assets/Scripts/GameManager.cs` |
| Bet history | `Assets/Scripts/CoinTossBetHistoryManager.cs` |
| Leaderboard | `Assets/Prefabs/Leaderboard/LeaderboardManager.cs` |
| Translations | `Assets/Scripts/Lang/LanguageManager.cs` |
| AES payload crypto | `Assets/Scripts/Crypto.cs` |
| Launch query params | `Assets/Scripts/URLParameters.cs` |
| Theming from `meta.customization` | `Assets/Scripts/Customizable.cs` |

---

## 1. Concepts

### 1.1 Game identity

`gameType` is a constant for this title: **`cointoss`**. It is serialized on the
`GameLoader` component in both scenes and is sent on authenticate, place-bet, bet
history and leaderboard calls. In the React port it should be a build-time constant,
not user input.

### 1.2 The `clientId` launch parameter

The game is launched inside an operator iframe with a query string. `clientId` is
**required**; everything else is optional.

```
https://<game-host>/cointoss/?clientId=<partnerSlug>-<AES_HEX>&lang=fr
```

| Param | Required | Notes |
|---|---|---|
| `clientId` | yes | `"<anything>-<encryptedServerBase>"`. Missing → fatal error screen. |
| `lang` | no | ISO-ish language code. Defaults to `en`; unknown codes fall back to `en` with a warning banner. |

The client splits `clientId` on `-` and **AES-decrypts index `[1]`** to obtain the
partner API origin (`serverBase`). A malformed `clientId` (decrypt throws) is a fatal
error. Note the split takes only the second segment — a `clientId` containing more than
one hyphen still resolves off segment `[1]` only.

```ts
const serverBase = decrypt(clientId.split('-')[1]); // e.g. "https://api.partner.example"
```

### 1.3 Base URLs

Three distinct bases exist after boot. Keep them separate; they are *not*
interchangeable.

| Name | Value | Used by |
|---|---|---|
| `serverBase` | `decrypt(clientId.split('-')[1])` | token call only |
| `mainUrlBase` | `decrypt(tokenResp.meta.patnerUrl)` | bet history (`/api/v1/…`) |
| `baseUrl` | `${mainUrlBase}/api/v2/` | authenticate, place bet, leaderboard |

`serverBase` and `mainUrlBase` are frequently the same host, but the client never
assumes it — always take `mainUrlBase` from the token response.

### 1.4 Envelope

Almost every partner endpoint returns the same envelope:

```ts
interface ServerResponse {
  status: boolean;
  data: string;        // often an AES-hex ciphertext, sometimes a plain token
  message: string;
  meta?: {
    patnerUrl?: string;      // AES-hex  (sic — "patner", not "partner")
    playerId?: string;       // AES-hex
    customization?: string;  // AES-hex of a ComponentData[] JSON
    partnerResponse?: string;
    gameWebsocket?: string;  // present in the DTO; unused by this client
  };
}
```

`status: false` is a **business rejection, not a transport error** — the HTTP status may
still be 2xx. Always branch on `status` before touching `data`.

Bet history and leaderboard are the exceptions: they return plain, unencrypted JSON with
their own shapes (§4, §5).

### 1.5 Payload encryption

AES-128-CBC, PKCS#7, fixed key and IV compiled into the client, ciphertext carried as an
**uppercase hex string** (no separators).

| | |
|---|---|
| Algorithm | AES-128-CBC, PKCS#7 padding |
| Key | UTF-8 bytes of `1234567890poiuyi` — the first 16 chars of `1234567890poiuyioii` |
| IV | Hex-decoded `76d7c69d097c5689fd0622c33433b5de` (16 bytes) |
| Wire format | Hex, uppercase on encrypt; decrypt accepts either case |

> **Security note, stated plainly:** this is obfuscation, not confidentiality. The key
> ships in the client bundle, so a browser-side React port exposes it exactly as the
> Unity WebGL build already does. Do not treat encrypted fields as trusted or tamper-proof
> on the server; keep the real authorization on the Bearer token. Porting the scheme
> as-is is the correct call for wire compatibility — just don't add new secrets to it.

Browser implementation (`crypto-js`, matches the C# byte-for-byte):

```ts
import CryptoJS from 'crypto-js';

const KEY = CryptoJS.enc.Utf8.parse('1234567890poiuyi');
const IV  = CryptoJS.enc.Hex.parse('76d7c69d097c5689fd0622c33433b5de');
const CFG = { iv: IV, mode: CryptoJS.mode.CBC, padding: CryptoJS.pad.Pkcs7 } as const;

export function encrypt(plainText: string): string {
  return CryptoJS.AES.encrypt(CryptoJS.enc.Utf8.parse(plainText), KEY, CFG)
    .ciphertext.toString(CryptoJS.enc.Hex)
    .toUpperCase();
}

export function decrypt(cipherHex: string): string {
  const cipherParams = CryptoJS.lib.CipherParams.create({
    ciphertext: CryptoJS.enc.Hex.parse(cipherHex),
  });
  return CryptoJS.AES.decrypt(cipherParams, KEY, CFG).toString(CryptoJS.enc.Utf8);
}
```

WebCrypto works too (`AES-CBC`, `importKey` the 16 raw key bytes) if you prefer no
dependency; the padding and IV handling are the defaults.

### 1.6 Request encoding

Every POST in the Unity client uses `WWWForm`, i.e.
`Content-Type: application/x-www-form-urlencoded`. **Not JSON.** Reproduce this with
`URLSearchParams` — sending `application/json` will not match the existing backend
handlers.

```ts
const body = new URLSearchParams({ gameType: 'cointoss' });
fetch(url, { method: 'POST', body }); // browser sets the urlencoded content-type
```

### 1.7 Authorization

All calls after the token call send:

```
Authorization: Bearer <token>
```

where `<token>` is `ServerResponse.data` from §2.1, used verbatim (it is *not* decrypted).

---

## 2. Boot sequence

The client runs two blocking calls in series, plus translations in parallel. Gameplay
does not activate until auth resolves; translations are allowed to land late and
re-apply.

```
                 ┌─ GET /lang/api/v1/languages → GET /lang/api/v1/languages/{code} ─┐
launch(clientId) ┤                                          (non-blocking)          ├→ UI text
                 └─ GET /api/v2/partner/fe/token → POST /api/v2/…/th-authenticate-player → game ready
```

Failure of either blocking call is **fatal**: show a terminal error panel and stop.
Failure of the language chain is a **warning**: fall back to English and keep playing.

### 2.1 Get token

```http
GET {serverBase}/api/v2/partner/fe/token
clientId: {clientId}
```

Note the credential is a bare **`clientId` header**, not `Authorization`.

**200 — success**

```jsonc
{
  "status": true,
  "message": "…",
  "data": "<opaque token string, used as-is>",
  "meta": {
    "patnerUrl":     "<AES-hex → 'https://api.partner.example'>",
    "playerId":      "<AES-hex → user id>",
    "customization": "<AES-hex → ComponentData[] JSON>"
  }
}
```

**Client-side handling**

```ts
const token       = resp.data;
const mainUrlBase = decrypt(resp.meta.patnerUrl);
const baseUrl     = `${mainUrlBase}/api/v2/`;
const userId      = decrypt(resp.meta.playerId);
const customData: ComponentData[] = JSON.parse(decrypt(resp.meta.customization));
```

**Errors**

| Condition | Client behaviour |
|---|---|
| Network unreachable | Fatal: *"Network error: Unable to contact the server…"* |
| Non-2xx with parseable envelope | Fatal: `{message}. Please relaunch the game` |
| Non-2xx unparseable, or any decrypt/JSON throw | Fatal: *"Unexpected server response caused an exception. Please relaunch the game"* |

### 2.2 Authenticate player

```http
POST {baseUrl}bet-placed/th-authenticate-player
Authorization: Bearer {token}
Content-Type: application/x-www-form-urlencoded

gameType=cointoss
```

**200 — success.** `data` is an AES-hex ciphertext whose plaintext is a *nested* envelope:

```jsonc
// resp.data → decrypt → JSON.parse →
{
  "status": true,
  "message": "…",
  "data": {
    "username": "TesterShacks",
    "currency": "USD",
    "balance":  "187542.89",   // string — keep it verbatim for display
    "odds":     { "1": 2 }     // keyed by level; this game only uses level "1"
  }
}
```

**Client-side handling**

```ts
const auth  = JSON.parse(decrypt(resp.data)) as AuthEnvelope;
const login = auth.data;

session.balanceText = login.balance;              // displayed as-is, no reformatting
session.balance     = parseDecimal(login.balance); // parsed with invariant culture
session.userName    = login.username;
session.currency    = login.currency;
session.odds        = login.odds['1'];             // e.g. 2 → rendered "2.00x"
```

> **Port note — number formatting.** The Unity client keeps `balance` as the raw server
> string for display and parses a separate `decimal` for comparisons. Reproduce that
> split: format with `Intl.NumberFormat` only where the original used `.ToString("N0")`
> (the ticker), and use a decimal-safe type (`decimal.js`, or integer minor units) for
> the balance/stake comparison. JS `number` on currency will drift.

Errors: identical policy to §2.1 — all fatal.

---

## 3. Placing a bet

One request drives the whole round. The server decides the outcome; the coin animation
is pure presentation replayed from `event.generatedOutcome`.

```http
POST {baseUrl}bet-placed/th-place-bet
Authorization: Bearer {token}
Content-Type: application/x-www-form-urlencoded

data={AES_HEX}
```

The single form field `data` is the ciphertext of:

```jsonc
{
  "currency":     "USD",
  "username":     "TesterShacks",
  "selection":    "head",     // "head" | "tail"  — "side" is never a selection
  "gameType":     "cointoss",
  "amountPlaced": 10.00       // rounded to 2 dp before serializing
}
```

`amountPlaced` is `Math.Round(stake, 2)`. Round before encrypting, not after — the
backend rejects >2 dp with *"You cannot place bet above 2 decimal place"*.

**200 with `status: true` — round resolved.** `data` decrypts to:

```jsonc
{
  "balance":  "188075.78",
  "currency": "USD",
  "event": {
    "won":              "false",   // string "true" | "false", case-insensitive
    "level":            1,
    "amount":           10,
    "betTime":          "2024-11-06T16:03:55.743Z",
    "processedTime":    "2024-11-06T16:03:55.743Z",
    "odds":             2,
    "generatedOutcome": "side",    // "head" | "tail" | "side"
    "selection":        "head",    // echo of what was staked
    "cashoutAmount":    "0"
  },
  "leaderboard": { /* LeaderboardEdge | null — see §5 */ }
}
```

**`status: false` — bet rejected.** Surface `message` to the player and **do not start
the animation**. This is the stake-limit / balance / session path and is an expected
outcome, not an error state. The Unity client explicitly returns before reading `data`
here; the React port must do the same or it will spin the coin on a rejected bet.

### 3.1 Outcome rules

- `generatedOutcome` is one of `head`, `tail`, `side`. **`side` always loses** — there is
  no push. Treat any value outside the three as a malformed response.
- Trust `event.won`, not a client-side comparison of `selection` vs `generatedOutcome`.
  Derive `outcome = won.toLowerCase() === 'true' ? 'won' : 'lost'`.
- `cashoutAmount` is the total returned to the player on a win, already computed by the
  server. Never recompute it from `amount × odds`.
- Apply `balance` from this response immediately; do not re-fetch a balance endpoint
  (there isn't one — see §11).

### 3.2 Round state machine

Worth porting deliberately, because the failure branches carry real money semantics.

| Phase | Trigger | UI state |
|---|---|---|
| `idle` | boot complete / new round | Bet controls live, stake editable |
| `submitting` | player picks head/tail | Buttons disabled, coin plays `load` loop |
| `spinning` | `status: true` received | Animation for `generatedOutcome`; stake locked |
| `resolved` | animation ends | Win/loss panel, balance updated, history refetched |
| `rejected` | `status: false` | Toast with `message`, return to `idle`, coin resets |
| `stalled` | network error | **Stay disabled**, poll connectivity, auto-resubmit |
| `error` | non-2xx / parse failure | Toast, return to `idle` |

**The `stalled` branch matters.** On a connection error the request never reached the
server, so no bet was placed and no money moved. The Unity client deliberately does
*not* hand control back: it keeps the round live, shows a retry panel, polls
connectivity every second, and silently resubmits the identical payload once the
network returns. Resubmitting is safe precisely because the original never landed.

Distinguish this from a non-2xx response — there the server *did* answer and rejected
the request, so the player must act (adjust stake, re-auth). In `fetch` terms: a thrown
`TypeError` is `stalled`; a resolved response with `!res.ok` is `error`.

Guard against double submission with a single in-flight flag (`isAttemptingServerCallBack`)
plus a per-round `hasMadeABet` flag, and keep exactly one reconnect poller alive at a time.

```ts
// Sketch of the branch that matters
try {
  const res = await fetch(url, { method: 'POST', body, headers });
  if (!res.ok) return toError(await safeMessage(res));   // server rejected → player acts
  const env = await res.json() as ServerResponse;
  if (!env.status) return toRejected(env.message);       // business rejection → no spin
  return toSpinning(JSON.parse(decrypt(env.data)) as BetData);
} catch {
  return toStalled();                                    // never reached server → auto-retry
}
```

After a round resolves the client refetches page 1 of bet history (§4).

---

## 4. Bet history

Plain JSON — **no encryption on this one**, and note it is `/api/v1/`, off
`mainUrlBase` rather than `baseUrl`.

```http
GET {mainUrlBase}/api/v1/bet-placed/partner/user/{userId}/{gameType}?limit=20&page={n}
Authorization: Bearer {token}
```

`userId` is the decrypted `meta.playerId` from §2.1. `page` is 1-based.

```jsonc
{
  "status": "success",     // string here, not boolean — unlike ServerResponse
  "message": "…",
  "data": {
    "bet": {
      "data": [
        {
          "gameType":         "cointoss",
          "username":         "TesterShacks",
          "result":           "won",        // "won" | "lost" | "pending" | "draw"
          "amountPlaced":     10,
          "cashoutAmount":    20,
          "potentialWinning": 20,
          "selectedEventType": [
            {
              "betTime":          "2024-11-06T16:03:55.743Z",
              "processedTime":    "2024-11-06T16:03:55.743Z",
              "selection":        "head",
              "generatedOutcome": "tail",
              "odds":             2,
              "amount":           10,
              "cashoutAmount":    0,
              "level":            1
            }
          ]
        }
      ],
      "pagination": {
        "to": 20, "from": 1, "totalPages": 5,
        "total": 94, "limit": 20, "currentPage": 1
      }
    }
  }
}
```

**Quirks to carry over**

- `selectedEventType` is polymorphic. The Unity client installs a custom converter that
  returns `null` when the array is empty or holds strings/integers instead of objects,
  and rows with no usable event are skipped entirely. Guard the same way — do not assume
  `selectedEventType[0]` exists.

  ```ts
  const evt = Array.isArray(row.selectedEventType) &&
              typeof row.selectedEventType[0] === 'object'
    ? row.selectedEventType[0] : null;
  if (!evt) return null; // skip the row
  ```
- `betTime` is **ISO 8601**, rendered as `dd/MM/yyyy`. If parsing fails the client falls
  back to printing the raw string rather than showing an error.
- Win amount displayed is `result === 'won' ? cashoutAmount : 0`, formatted `0.##`.
- `result` and `generatedOutcome` are used as **translation dictionary keys** (`won`,
  `lost`, `head`, `tail`, `side`) with fallback to the raw value on a miss.
- Outcome icon: substring match — contains `head` → heads sprite, contains `tail` →
  tails sprite, anything else → side sprite.
- The paging UI is prev/next only and ignores `pagination.totalPages`; `Next` past the
  end simply renders the empty state. Using `totalPages` to disable the button is a
  legitimate improvement in the port.
- A failed request logs and leaves the current page rendered — it is never fatal.

---

## 5. Leaderboard

```http
GET {baseUrl}leaderboard?gameType={gameType}
Authorization: Bearer {token}
```

Plain JSON, standard `status`/`message`, relay-style `data.edges`:

```jsonc
{
  "status": true,
  "message": "…",
  "data": {
    "edges": [
      {
        "id": "…", "userId": "…", "username": "player1",
        "projectName": "…", "projectId": "…",
        "isActive": true,
        "reward": "500",
        "rank": 1,
        "gameType": "cointoss",
        "type": "…",
        "meta": {
          "date": "2025-01-01T00:00:00.000Z",
          "reward": "500",
          "criteria": {
            "reward": "500", "occurence": "daily",
            "description": "…", "minimumBets": "10", "minimumWager": "1000"
          },
          "userAction": { "bets": "12", "wager": "1500" }
        },
        "createdAt": "…", "updatedAt": "…", "deletedAt": null
      }
    ],
    "pageInfo": {
      "hasNextPage": false, "hasPreviousPage": false,
      "startCursor": "…", "endCursor": "…"
    },
    "totalCount": 25
  }
}
```

- Sort client-side by `rank` ascending — server order is not guaranteed.
- `rank === 1` gets the trophy icon; avatars are assigned randomly from a sprite pool
  (there is no avatar field on the API).
- `pageInfo` is relay-style cursor page info, but the client never paginates; the whole
  board is rendered in one shot.
- The place-bet response may embed a `leaderboard` object of this same `LeaderboardEdge`
  shape. When present, the client shows a one-time-per-session toast:
  *"You are now ranked #{rank} on the leaderboard with a reward of {reward}!"*
- Visibility is gated by the `cointoss-leaderboard-status` customization toggle (§6).

---

## 6. Customization / theming

`meta.customization` from the token call decrypts to a flat array of key/value records
that drive the entire skin. There is no separate theming endpoint.

```ts
interface ComponentData {
  _id: string;
  name: string;       // the lookup key
  value: string;      // hex color | text | "true"/"false" | number-as-string
  type: string;
  partnerId: string;
  createdAt: string;
  updatedAt: string;
}
```

Lookup is by `name`; a missing key means "leave the default alone". Every parse is
individually guarded — one bad hex color must not take down the theme.

**Value kinds** (Unity's `Type` enum, mapped to what the React port needs):

| Kind | Value format | React equivalent |
|---|---|---|
| `imageColor` / `camColor` | `#RRGGBB` / `#RRGGBBAA` | CSS custom property (background) |
| `textColor` | `#RRGGBB` | CSS custom property (color) |
| `alternatingColor` | `#RRGGBB` | win/loss result color pair |
| `text` | string | copy, **passed through the translation dictionary first** |
| `toggle` | `"true"` / `"false"` | conditional render |

**Known keys**

*Toggles* — `display-navbar`, `display-language`, `show-balance`,
`cointoss-leaderboard-status`

*Value* — `default-stake-amount` (parsed as float; client default `10`)

*Colors* — `background-color`, `bet-panel-background-color`, `ticker-background-color`,
`balance-background-color`, `balance-text-color`, `currency-text-color`,
`heads-button-color`, `heads-button-text-color`, `tails-button-color`,
`tails-button-text-color`, `add-button-color`, `add-button-text-color`,
`subtract-button-color`, `subtract-button-text-color`, `quick-add-button-color`,
`quick-add-button-text-color`, `stake-inputfield-background-color`,
`stake-inputfield-outline-color`, `stake-inputfield-text-color`,
`bet-confirmation-primary-background-color`, `bet-confirmation-secondary-background-color`,
`bet-confirmation-text-color`, `bet-confirmation-button-color`,
`bet-confirmation-button-text-color`, `bet-cancellation-button-color`,
`bet-cancellation-button-text-color`, `rebet-button-color`, `rebet-button-text-color`,
`newround-button-color`, `newround-button-text-color`, `result-detail-text-color`,
`win-game-outcome-text-color`, `loss-game-outcome-text-color`,
`menu-display-background-color`, `navlinks-color`,
`about-display-primary-background-color`, `about-display-secondary-background-color`,
`about-display-text-color`, `bet-history-display-background-color`,
`bet-history-display-text-color`, `insufficient-funds-background-color`,
`insufficient-funds-header-color`, `insufficient-funds-text-color`,
`close-insufficient-funds-button-color`, `close-insufficient-funds-button-text-color`

Suggested port: resolve the array once into a `Record<string, string>` at boot, then emit
the color keys as CSS custom properties on `:root` and read toggles from a context.

```ts
const theme = Object.fromEntries(customData.map(d => [d.name, d.value]));
for (const [k, v] of Object.entries(theme))
  if (k.endsWith('-color')) document.documentElement.style.setProperty(`--${k}`, v);
```

---

## 7. Translations

A separate, **unauthenticated** service on a fixed host — not the partner backend, and
it needs no `clientId` or Bearer token.

```
https://game.shacksevo.co/lang/api/v1
```

### 7.1 List languages

```http
GET https://game.shacksevo.co/lang/api/v1/languages
```

```jsonc
{ "data": { "en": "English", "fr": "Français", "es": "Español" }, "message": "…" }
```

A map of `code → display name`, flattened client-side into a list for the picker.

### 7.2 Translate a batch

```http
GET https://game.shacksevo.co/lang/api/v1/languages/{code}?texts=["Head","Tail","Stake"]
```

`texts` is a **URL-encoded JSON array of strings**. The response is a positional array —
index `i` of `data` corresponds to index `i` of `texts`.

```jsonc
{ "data": ["Tête", "Queue", "Mise"], "message": "…" }
```

**Behaviour to carry over**

- `code === "en"` short-circuits entirely: the client uses the English keys as their own
  values and issues **no request**.
- Each translation is capitalized (first char upper) before being stored.
- A blank or whitespace-only translation falls back to the original English key.
- The whole dictionary is one batch request seeded from ~130 hardcoded English keys —
  UI copy, server error messages, and outcome words (`won`, `lost`, `head`, `tail`,
  `side`) all live in the same map. Server error messages are looked up in it too, which
  is how backend messages get localized.
- A single ad-hoc string can be translated on demand (used for toast messages not in the
  seed set); the result is memoized into the dictionary.
- Every failure path is non-fatal: fall back to English and show a yellow warning banner.
- Translation may resolve **after** gameplay starts. The Unity client re-applies
  language-dependent UI when it lands. In React this is naturally a context update —
  just make sure customization `text` values and the language picker re-render.

> The positional-array contract is fragile: it breaks silently if the request and
> response arrays ever diverge in length. Consider guarding on
> `data.length === texts.length` in the port and falling back to English wholesale if not.

---

## 8. TypeScript definitions

```ts
export type Outcome   = 'head' | 'tail' | 'side';
export type Selection = 'head' | 'tail';
export type BetResult = 'won' | 'lost' | 'pending' | 'draw';

export interface ServerResponse {
  status: boolean;
  data: string;
  message: string;
  meta?: {
    patnerUrl?: string;
    playerId?: string;
    customization?: string;
    partnerResponse?: string;
    gameWebsocket?: string;
  };
}

/** decrypt(ServerResponse.data) from th-authenticate-player */
export interface AuthEnvelope {
  status: boolean;
  message: string;
  data: LoginData;
}

export interface LoginData {
  username: string;
  currency: string;
  balance: string;                    // string; keep verbatim for display
  odds: Record<string, number>;       // { "1": 2 }
}

/** decrypt(ServerResponse.data) from th-place-bet */
export interface BetData {
  currency: string;
  balance: string;
  event: OutcomeResult;               // JSON key is "event"
  leaderboard: LeaderboardEdge | null;
}

export interface OutcomeResult {
  level: number;
  betTime: string;                    // ISO 8601
  processedTime: string;
  generatedOutcome: Outcome;
  selection: Selection;
  won: string;                        // "true" | "false"
  odds: number;
  amount: number;
  cashoutAmount: number;
}

export interface PlaceBetPayload {
  currency: string;
  username: string;
  selection: Selection;
  gameType: 'cointoss';
  amountPlaced: number;               // 2 dp max
}

export interface HistoryResponse {
  status: string;                     // "success" — string, not boolean
  message: string;
  data: { bet: { data: BetRecord[]; pagination: Pagination } };
}

export interface BetRecord {
  gameType: string;
  username: string;
  result: BetResult;
  amountPlaced: number;
  cashoutAmount: number;
  potentialWinning: number;
  selectedEventType: OutcomeResult[] | null;   // may be null / non-object entries
}

export interface Pagination {
  to: number; from: number; totalPages: number;
  total: number; limit: number; currentPage: number;
}

export interface LeaderboardResponse {
  status: boolean;
  message: string;
  data: {
    edges: LeaderboardEdge[];
    pageInfo: {
      hasNextPage: boolean; hasPreviousPage: boolean;
      startCursor: string; endCursor: string;
    };
    totalCount: number;
  };
}

export interface LeaderboardEdge {
  id: string; userId: string; username: string;
  projectName: string; projectId: string;
  isActive: boolean;
  reward: string;
  rank: number;
  gameType: string; type: string;
  meta: {
    date: string;
    reward: string;
    criteria: {
      reward: string; occurence: string; description: string;
      minimumBets: string; minimumWager: string;
    };
    userAction: { bets: string; wager: string };
  };
  createdAt: string; updatedAt: string; deletedAt: string | null;
}

export interface ComponentData {
  _id: string; name: string; value: string; type: string;
  partnerId: string; createdAt: string; updatedAt: string;
}

/** Everything the boot sequence produces. */
export interface Session {
  clientId: string;
  gameType: 'cointoss';
  token: string;
  mainUrlBase: string;                // no trailing slash
  baseUrl: string;                    // `${mainUrlBase}/api/v2/`
  userId: string;
  userName: string;
  currency: string;
  balanceText: string;
  balance: number;
  odds: number;
  customization: ComponentData[];
}
```

---

## 9. Endpoint summary

| # | Method | URL | Auth | Body | Encrypted |
|---|---|---|---|---|---|
| 1 | GET | `{serverBase}/api/v2/partner/fe/token` | `clientId` header | — | `meta.*` out |
| 2 | POST | `{baseUrl}bet-placed/th-authenticate-player` | Bearer | form `gameType` | `data` out |
| 3 | POST | `{baseUrl}bet-placed/th-place-bet` | Bearer | form `data` | in **and** out |
| 4 | GET | `{mainUrlBase}/api/v1/bet-placed/partner/user/{userId}/{gameType}?limit&page` | Bearer | — | no |
| 5 | GET | `{baseUrl}leaderboard?gameType={gameType}` | Bearer | — | no |
| 6 | GET | `{LANG}/languages` | none | — | no |
| 7 | GET | `{LANG}/languages/{code}?texts=[…]` | none | — | no |

`{LANG}` = `https://game.shacksevo.co/lang/api/v1`

---

## 10. Error handling policy

| Class | Detection | Policy |
|---|---|---|
| Fatal boot | token or authenticate fails, by any cause | Full-screen red panel, no gameplay, "relaunch the game" |
| Business rejection | HTTP 2xx with `status: false` | Toast `message` (translated), return to idle, **no animation** |
| Server error | non-2xx | Parse envelope for `message`; on parse failure use the generic exception copy. Player must act. |
| Connectivity | request never completed | Round stays live, controls stay disabled, auto-resubmit on reconnect |
| Non-fatal fetch | history / leaderboard / translations | Log, keep last good state, English fallback for language |

Backend `message` strings are localized by looking them up in the translation dictionary
(§7) with pass-through fallback. Known values include *"Error processing your request"*,
*"You no longer have access to the game"*, *"Invalid Partner"*, *"Invalid Aggregator"*,
*"You cannot place bet above 2 decimal place"*, *"Error debitting your wallet"*,
*"Bet already closed. Kindly reload the game"*, *"Session Exipired"* (sic).

---

## 11. Notes for the React port

**Present in the DTOs but unused by this client** — do not build against them without
confirming with the backend team: `meta.gameWebsocket` (no socket connection exists
anywhere in this codebase — the game is strictly request/response),
`meta.partnerResponse`, and the `RtpData`, `GameRoundData`, `PartnerData`, `UserInfo`,
`BalanceData`, `GameOutcome` structures, which are dead code left from earlier titles.

**There is no balance endpoint.** Balance arrives with authenticate and with every
place-bet response, and is authoritative from there. Don't invent a poll.

**Client-side state persisted locally** (Unity `PlayerPrefs` → `localStorage`):

| Key | Meaning |
|---|---|
| `ctstake` | last stake amount, restored on next launch |
| `ocb` | one-click-bet toggle (`0`/`1`) |
| `tutorialCheckCointoss` | tutorial-seen flag; survives the prefs wipe on boot |

The client clears all other stored keys on every launch, keeping only
`tutorialCheckCointoss`. Match that if you want identical session semantics.

**Client-side validation before the request:** stake must be `> 0`, at most 2 dp, and
`<= balance` — an over-balance stake opens the insufficient-funds dialog and never
reaches the network.

**Odds display:** `odds['1']` rendered as `${odds.toFixed(2)}x` (e.g. `2.00x`).

**Device/orientation:** Unity ships separate mobile (portrait) and desktop (landscape)
scenes and redirects between them on load, plus an orientation nag overlay. In React this
collapses to CSS media queries and one responsive tree — no API impact.

**Suggested module layout**

```
src/api/
  crypto.ts       encrypt / decrypt          (§1.5)
  client.ts       fetch wrapper, Bearer, form encoding, error classification (§1.6, §10)
  session.ts      getToken + authenticate    (§2)
  bets.ts         placeBet, getBetHistory    (§3, §4)
  leaderboard.ts  getLeaderboard             (§5)
  lang.ts         getLanguages, translate    (§7)
  types.ts        the definitions in §8
```

Keep `crypto.ts` the only module that knows about the AES scheme, and have `client.ts`
own the `stalled` vs `error` distinction from §3.2 — those two boundaries are where a
naive port is most likely to introduce a money bug.
