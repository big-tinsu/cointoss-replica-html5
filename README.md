# Coin Toss — HTML5 Replica

A Vite + React + TypeScript port of the **Coin Toss** Unity (C#) coin-flip
betting game — same design, same gameplay, same backend contract shape.
Source of truth is `/Users/jimi/codes/cointoss-aggregator-v2026`, reverse
-engineered into the spec this port was built from.

This is a faithful conversion to a lighter-weight stack, not a redesign. Art,
sounds, copy, round timing/payout logic, and the aggregator API contract are
all the originals.

> **Built fresh, independently.** A separate, pre-existing HTML5 rebuild of
> this same game already exists at
> `/Users/jimi/codes/cointoss-aggregator-v2026/web` (15 commits, its own
> design-system doc). Per an explicit product decision, this repo was built
> from scratch directly against the Unity C# source and the reverse
> -engineering spec — it does not read, copy from, or share code with that
> other build.

## Run it

```bash
npm install
npm run dev          # Vite on :5173 + the mock aggregator backend on :8787
```

Open http://localhost:5173 — Coin Toss's token contract needs **no launch
query params at all** (unlike Penaldo/Keno's `?clientId=...`): the whole page
URL itself is the encrypted credential payload, and in dev that payload is
just posted to the local mock aggregator (`src/api/devBootstrap.ts` documents
this; there is nothing to mint or mutate into the URL). Pass `?language=xx`
to test localization.

```bash
npm run build          # tsc -b + production bundle
npm run typecheck       # tsc --noEmit only
npm run dev:client       # vite only
npm run dev:server        # mock backend only, http://localhost:8787
MOCK_FORCE_OUTCOME=head npm run dev:server   # force every round to land on heads
MOCK_FORCE_OUTCOME=tail npm run dev:server   # force every round to land on tails
MOCK_FORCE_OUTCOME=side npm run dev:server   # force every round to land on the (always-losing) side
MOCK_OPEN_ROUND=1 npm run dev:server         # seed an abandoned open round on first boot
```

The mock backend (`server/index.js`) is a single-player, in-memory
implementation of every real endpoint (see "Backend contract" below),
including the server-authoritative three-outcome RNG.

### Previewing a deploy with `?mock=1`

A deployed build normally posts its token exchange to
`https://portal.shacksevo.co/api/v2/partner/agg/token`. That endpoint currently
returns `500 {"status":false,"message":"Unexpected number in JSON at position
1"}` for every launch, and a failed token is fatal (`gameEngine.ts` →
`phase: "fatal-error"`), so the deploy cannot be previewed at all.

The failure is server-side and downstream of decryption — the backend decrypts
our `url` **and** the partner's `clientId` successfully, then throws parsing the
clientId's own pipe-delimited `sessionId|userId|timestamp|hash` payload as JSON.
Ruled out client-side: body encoding (`application/json` and
`x-www-form-urlencoded` give the identical error; `multipart/form-data` gives a
*different* one, `400 Invalid URL`, which proves our payload decrypts fine) and
URL normalization (with and without the trailing slash are identical).

So `?mock=1` routes a built deploy at the same mock backend `npm run dev` uses,
served as a Vercel function from `api/mock.js`:

```
https://<deploy-host>/?mock=1
```

No `clientId`, no credentials, no real backend. Opt-in and non-shadowing:

- Without the flag a launch behaves exactly as before — `isMockBackend()`
  (`src/api/urlParams.ts`) is the only thing that redirects the contract.
- The mock's routes live under `/api/mock/**`, never at the real `/api/v2/**`
  contract paths, so it cannot shadow production even if the game were pointed
  at this origin. The token response's `meta.patnerUrl` carries that prefix, so
  authenticate / place-bet / actions / bet-history follow it automatically.
- The flag is a deliberate no-op in dev, where `/api/**` is already proxied to
  the mock and the prefix would miss the Express routes.

Preview-only limitations, both from the mock holding state in memory with no
shared store between serverless invocations:

- The wallet resets to the seed balance whenever a cold instance serves a
  request. Balances are illustrative, not a running ledger.
- `agg-place-bet` escrows the pending bet and `agg-actions` resolves it on the
  next request. Those are milliseconds apart and normally hit the same warm
  instance, but a cold start landing between them surfaces the mock's own
  "You've no ongoing round. Kindly reload!" error.

Token validation is shape-based rather than `Set`-backed under
`MOCK_STATELESS_TOKENS=1` (set by the wrapper) for the same reason: the token
exchange and the authenticate call that follows it are separate requests and
would otherwise 401 whenever the second missed the first one's instance.

## How the port maps to the Unity project

| Unity | Here |
| --- | --- |
| `GameLoader.cs` — wipe prefs, POST encrypted href → token → authenticate, language in parallel | `src/api/client.ts` `requestToken`/`authenticate`, `src/state/gameEngine.ts` `boot()` |
| `GameManager.cs` — bet, round flow, re-authenticate, notifications, orientation check | `src/state/gameEngine.ts` (`GameEngine` class), `src/hooks/useOrientationGuard.ts` |
| `UIManager.cs` — `SelectChoice`/`ConfirmBet`, `OnWin`/`OnLoss` | `gameEngine.ts` `chooseAndBet()`, `src/components/ResultsPanel.tsx` |
| `VirtualCashManager.cs` — stake, `GenerateValuesInRange`, `AddToStake`, `CheckBalance` | `src/state/quickBet.ts` (`generateQuickBetValues`), `gameEngine.ts` stake methods |
| `StakeInput.cs`/`LimitDecimalPlaces.cs` — manual stake entry, keystroke sanitizing | `gameEngine.ts` `setStakeText`/`commitStake`, `src/state/format.ts` |
| `KeypadManager.cs` (`Assets/Keypad/`) | `src/components/NumericKeypad.tsx` |
| `Ticker.cs` — fabricated "recent big wins" marquee | `src/components/Ticker.tsx` |
| `CoinTossBetHistoryManager.cs`/`CoinTossBetRecord.cs` | `src/api/client.ts` `fetchBetHistory`, `src/components/BetHistoryPanel.tsx` (one component, CSS-only desktop/mobile switch) |
| `Crypto.cs` — AES-128-CBC, uppercase hex | `src/api/crypto.ts` (Web Crypto SubtleCrypto), `server/crypto.js` (Node `crypto`, byte-identical) |
| `LanguageManager.cs` | `src/i18n/strings.ts` (the ~95-key default table) + `src/i18n/LanguageContext.tsx` + `src/i18n/languageClient.ts` |
| `Customizable.cs`/`ColorOption.cs` — partner theming | `src/components/Customizable.tsx` (`CustomizationProvider`, `useCustomColor`, `useCustomToggle`, `CustomizableText`, `useAlternatingColor`) |
| `DynamicUiManager.cs` — the `Responsive` node's live-resize script | Superseded by the design-space `Stage` — see "Visual fidelity" below |
| `GameManager.DisplayOrientationMessage`/orientation prefabs — **the one real orientation overlay of the three sibling games** | `src/hooks/useOrientationGuard.ts` + `src/components/OrientationOverlay.tsx` (reactive `matchMedia`, not a polling loop) |
| `Assets/Animations/Game/{head,tail,side,load,idle}.anim` | `data-anim` attribute + the identically-named CSS `@keyframes` in `src/components/CoinStage.tsx`/`index.css` |
| `PlayConfetti.cs` (dormant) | `src/components/ConfettiBurst.tsx` — small CSS celebration, see below |

## Backend contract

Implemented by `server/index.js` for local dev, matching the Unity client's
`UnityWebRequest` contract. **This is a genuinely different contract shape
from the Penaldo/Keno sibling ports** (a newer, more generic multi-aggregator
architecture, spec §4):

| Step | Endpoint |
| --- | --- |
| Token exchange | `POST {tokenUrl}/api/v2/partner/agg/token`, form field `url` = AES-encrypted full page href (NOT a GET + `clientId` header) |
| Authenticate (boot) / Re-authenticate | `POST {baseUrl}bet-placed/agg-authenticate` (note the `agg-` prefix, not `th-ml-`) — same endpoint reused, `initialRound=true` first, `false` every round after |
| Place bet | `POST {baseUrl}bet-placed/agg-place-bet` — encrypted `{sessionId, difficulties:"none", amountPlaced, selection}`. Escrows the bet; the RNG has NOT run yet. |
| Resolve | `POST {baseUrl}bet-placed/agg-actions` — encrypted `{sessionId, selection}`, fired automatically the instant place-bet succeeds with zero player action. Response decrypts to `{data:{event:[OutcomeResult]}}` — this is the one call whose response carries the server-decided `head`/`tail`/`side` outcome. |
| Abandoned-round settle | `POST {baseUrl}bet-placed/agg-manual-actions` — encrypted `{sessionId}`. NOT a live cashout button (see below); only ever called automatically from boot's reconciliation path. |
| Bet history | `GET {mainUrlBase}/api/v1/bet-placed/partner/user/{sessionId}/{gameType}?aggregator=true&limit=10&page={n}` — keyed off **`sessionId`** (not `userId`), carries the `aggregator=true` flag. Both unique to this game vs. Penaldo/Keno. |
| Languages | `GET /lang/api/v1/languages`, `GET /lang/api/v1/languages/{code}?texts=[...]` — stubbed locally instead of `game.shacksevo.co` |

Notes carried over verbatim:

- `event.won` is the **string** `"true"`/`"false"`, not a JSON boolean.
- `ServerResponse.meta.data` is a field new to this contract (vs. Penaldo/
  Keno) — decrypts to `AggregatorData{name,id,server,type,aggregator,mode,
  data}`. The raw ciphertext is resent verbatim as the `data` form field on
  every authenticate call, never re-derived client-side.
- Min/max bet are **real and enforced** here (`aggregatorCurrency.minimum/
  maximum`) — a genuine difference from both sibling games, where the
  equivalent field exists but is never populated. The mock uses
  `minimum=1, maximum=500, currency=USD`.
- Quick-bet chips are **procedurally generated**, not hardcoded — see
  `src/state/quickBet.ts`, a direct port of `VirtualCashManager.
  GenerateValuesInRange(min, max, buttonCount)`: a log-scaled spread of
  `{1,2,5}×10ⁿ` candidates evenly sampled between the live min/max.
- The AES key/IV (`Crypto.cs`) are reproduced exactly, matching the sibling
  Penaldo/Keno ports — the same hardcoded key/IV pair is now confirmed shared
  across at least three Shacks Evolution titles.

### The "side" outcome and win probability (a documented judgment call)

The client source never reveals the server's RNG weighting — `Outcome` is a
3-value enum (`head`/`tail`/`side`) but the player can only ever choose
`head`/`tail`; landing on the coin's edge is always a loss regardless of
choice (confirmed by the localization string: *"If the coin lands on its
side (neither heads nor tails), the bet is lost."*). This means the true win
probability is strictly below a fair 50/50 coin, and the exact split isn't
computable from the client alone (spec §2/§11 flags this explicitly and
recommends confirming with the backend team — there being no real backend
team here, this mock had to pick something).

**Chosen split**: `head 48%`, `tail 48%`, `side 4%` (`server/state.js`). Since
either player choice only wins when the coin lands on that exact face, the
true player win probability is **48%** — a small, plausible house edge below
the fair-coin 50% baseline, satisfying the spec's finding without being an
implausibly large edge. The payout multiplier (`odds["1"]`) is set to
**1.92x**, chosen as a realistic near-even-money multiplier for this
structure.

## Game flow (spec §1)

1. **Boot** — wipes all Coin-Toss-owned `localStorage` keys (no tutorial-flag
   exception, unlike Penaldo/Keno), builds a fresh session, fires the
   language fetch in parallel (non-blocking).
2. **Token + Auth** — POSTs the encrypted page href, decrypts the aggregator
   payload + partner base URL + customization, then authenticates
   (`initialRound=true`) to get balance/min/max/odds/sessionId.
3. **Idle** — tapping Heads or Tails **is** the bet-confirmation action; there
   is no separate confirm step (the source's `betConfirmationPanel` codepath
   is fully commented out).
4. **Place bet → Resolve** — two sequential HTTP calls fire back-to-back with
   zero player action in between; the coin only starts "flipping" once the
   outcome is already known from the resolve response.
5. **Coin flip** — a flat 5-second wait (`WaitForSeconds(5)`, no per-frame
   callback, no fallback timeout — the source has neither), with the CSS
   animation state literally named after the outcome.
6. **Reveal** — re-authenticates (balance resync only, not min/max/odds —
   those are boot-only fields per the source's `RunAuthenticate` vs.
   `ReAuthenticate` field-list difference), then shows the win/loss panel:
   gold "You just won…" or red "You lost. You chose…".
7. **Rebet vs. New Round** — `Rebet` remembers the last choice and
   immediately re-places the same choice+stake in one tap, without returning
   to idle; `New Round` just returns to idle. Implemented as two distinct
   engine actions (`rebet()` vs. `newRound()`), matching the source's
   `ReBet()`/`StartNewRound()` split.
8. **Abandoned-round reconciliation** — if boot's authenticate response
   carries a leftover `openRound`, it's auto-settled via
   `agg-manual-actions` + a suppressed-reveal re-authenticate, with no player
   interaction — not a replay-the-events resume UX. (`MOCK_OPEN_ROUND=1`
   exercises this path in the mock, since a single synchronous Node process
   otherwise has no natural way to leave a round "abandoned".)

## What was intentionally skipped or simplified

Per the reverse-engineering spec, confirmed dead/out-of-scope/non-functional
in the original Unity project:

- **Pariplay/Jelly/Uplatform aggregator integrations** — real, load-bearing
  third-party SDK contracts in the source (bridge events, a
  network-traffic-sniffing session-id shim, auto-retry-on-error policy), but
  explicitly out of scope for a standalone rebuild per the task brief. This
  port implements the generic/no-aggregator-name path only — the mock's
  `aggregator.name` is an empty string, which reads as "falsy/generic" to
  every `=== "pariplay"`-style branch the original client has. A real
  integration with any of these three aggregators would need dedicated
  design/engineering attention, not a mechanical port (Jelly's approach in
  particular — monkey-patching `fetch`/`XHR` to sniff a sibling script's
  network traffic — has no direct non-Unity equivalent).
- **Replay mode** — confirmed non-functional even in the source: the scene
  component (`ReplayManager`) that would consume `GameLoader.RunReplay()`'s
  fetched data doesn't exist anywhere in the project. Not built here at all;
  launching with `?replayMode=true` surfaces a fatal error explaining it's
  unsupported, rather than either building a UI for an admittedly-incomplete
  feature or silently ignoring the param.
- **`CashOut` button / `SelectChoices`/`SingleRound`/`MultiRound` bindings** —
  all point at nonexistent methods in the source (confirmed broken/dead scene
  wiring). Not ported: there is no cashout button, no multi-round batch
  betting, and Side is never a selectable player choice (outcome-only).
- **`CheckForFreeBet()`/free-bet accrual** — zero call sites anywhere in the
  39 read Unity scripts; not wired up.
- **`Odds.One`** stored on session state (spec-faithful) but not displayed
  anywhere beyond the help modal's payout line — matching the source, where
  it's fetched once and otherwise unreferenced.
- **The 6 dead Data Structure classes** (`AggregatorResponse`, `CashoutData`,
  `EarData`, `EveBalance`, `PartnerData`, `SwinttData`, `SelectedEvent`) and
  the tier-limit fields (`firstLimit`...`lastLimit`) — kept as unused TS
  types in `src/api/types.ts` for contract completeness only, never wired up.

Simplified rather than skipped:

- **Stake-persistence bug — fixed, not reproduced.** The source reads the
  remembered stake back via `PlayerPrefs.GetFloat("ctstake", ...)` but every
  writer persists to a different key, `"stbstake"` — so `"ctstake"` is never
  actually written, and the stake silently resets to the session minimum on
  every Rebet/New Round. This port uses ONE consistent key
  (`src/state/persistence.ts`) instead — a deliberate improvement over the
  source bug, documented per the task brief rather than reproduced for
  parity.
- **Obfuscated `PlayerPrefs` keys** (`SavedData.cs`'s `SavedParams`, e.g.
  `"9349 130 403 910 CT"` for the free-bet flag) — provide no real security
  and gate a mechanic (free bets) that isn't ported at all here, so plain,
  readable `localStorage` keys are used throughout instead.
- **`PlayConfetti`/free-bet celebration** — the source's actual trigger
  condition (`CheckForFreeBet()`) has zero call sites, so rather than guess
  at an unconfirmed trigger, this port ties a small CSS-only confetti burst
  (`ConfettiBurst.tsx`) to the simplest available clear condition: any
  winning round (Coin Toss has no jackpot/tier structure to gate a rarer
  celebration on instead).
- **About panel + onboarding help copy** — the source has separate
  `aboutPage`/help-onboarding GameObjects pointed at overlapping static copy;
  consolidated into one `HelpModal` here since there's no distinct content to
  justify two panels.
- **Custom on-screen keypad** — ported as `NumericKeypad.tsx` (matching the
  sibling ports' convention), gated on the live portrait breakpoint rather
  than an `Application.isMobilePlatform` device check, per the same
  responsive-layout approach used throughout.
- **Font** — `Assets/Fonts/bestime/Bestime.ttf`'s bundled `More Info.txt`
  states *"This product 100% free for personal use & commercial use"* — an
  explicitly permissive license, so the real font file is embedded
  (`public/fonts/Bestime.ttf`, `@font-face` in `index.css`) with a bold
  system-font fallback stack for environments where it fails to load.
- **Sound** — only `Button Click.wav` is ported (`public/assets/sound/
  button-click.wav`), the one clip with a confirmed live code reference
  (`VirtualCashManager.playButtonClick()`). `Card Flip.wav`, `fail.wav`, and
  `star.wav` have no C# or scene-text reference anywhere in the source —
  `"Card Flip.wav"` in particular echoes the same card-game-template-leftover
  pattern as the excluded localization strings below — so they're treated as
  likely-dead template audio and not included.
- **Brand logo** — `shacksevobanner.png` is used as the canonical logo, not
  `Onerapidplay Logo.png` (a differently-branded asset sitting alongside it
  in the source); Shacks Evolution Studios is this project's own studio per
  `ProjectSettings.asset`, so it's the canonical choice for a standalone
  rebuild.

## Localization

`src/i18n/strings.ts` holds the ~95-key Coin-Toss-specific string table
extracted directly from `Assets/Scripts/Lang/LanguageManager.cs`
`gameTexts`. Two confirmed-dead card-game-template leftovers are **excluded**
per the task brief (no call site anywhere in Coin Toss's own code paths):
`"No dealer card. Please shuffle the card"` and `"Card shuffle successfully"`
— the same shared-template lineage flagged in the sibling Keno spec.

All text access goes through a safe lookup-with-fallback (`t(key)` returns
the raw key on a miss) — the spec explicitly calls this out as the right fix
over the source's inconsistent mix of a safe `GetText()` helper alongside a
throwing `gameTexts[key]` indexer used elsewhere in the same file.

`src/i18n/LanguageContext.tsx` reproduces `TranslateAll`/`Translate`: fetch
the language list on boot using the URL's `language` param (not `lang`, as in
Penaldo/Keno), translate all keys in one shot (falling back to English on any
failure, non-fatally), and support one-off ad-hoc translation for
partner-supplied customization text. `server/languages.js` stubs a small
`fr`/`sw` translation set for the more visible gameplay keys and echoes the
rest back untranslated.

## Orientation overlay (removed)

The source's `PortraitOrientationWarning` /
`GameManager.DisplayOrientationMessage` (spec §1 step 17, §7) is the one game
of the three siblings where that "please rotate your device" overlay is live
code rather than a dead/commented-out path, and it was originally ported here
(`useOrientationGuard.ts` + `OrientationOverlay.tsx`, an aspect check at mount
compared against live `matchMedia('(orientation: portrait)')` events).

It has since been **removed by request**: both scenes now render from their own
token set at whatever orientation the device is in (`DesignProvider` already
swaps the Mobile/Desktop layouts on `isPortrait`), so nagging the player to
rotate no longer served a purpose. The `ORIENTATION` rects are gone from both
`design.ts` and `design.desktop.ts`, along with the overlay's localized copy.
`icons8-rotate-phone-64.png` is still in `public/` (the asset manifest is
generated from the filesystem) but nothing references it.

## Assets

Copied from `cointoss-aggregator-v2026/Assets` into `public/` (`.meta`,
`.DS_Store`, and `~`-suffixed/`.kra` Krita source/backup files skipped):

- `assets/ui/` — the 13 real sliced comp frames actually referenced by the
  scene (`Interface Design - Coin & Toss - mobile - {1,4,6,7,8,10,11,12,13,
  14,15,16,19}.png`), renamed descriptively (`logo`, `bal-panel`, `chip`,
  `heads-button`, `tails-button`, `backdrop`, …) — see "Visual fidelity".
- `assets/img/` — coin faces (`heads.png`/`tails.png`/`side.png`), background
  art, UI chrome, mute/unmute icons, `win-art.png`, the brand banner, the
  keypad's `round-edge-sprite.png`/`point.png`, and the orientation-overlay
  `icons8-rotate-phone-64.png`.
- `assets/handtoss/` — the 5-frame hand/coin-toss gesture sequence.
- `assets/sound/button-click.wav` — see "Sound" above.
- `fonts/Bestime.ttf` — see "Font" above.
- `reference/` — the 22 real "Interface Design - Coin & Toss" mockup
  PNGs/JPGs (1 desktop + 19 mobile comps + 2 reference photos), copied
  verbatim as designer reference, not runtime assets the app loads.

## Visual fidelity

The presentation layer was rebuilt from scratch against
`/Users/jimi/codes/unity-ui-extract/out/cointoss.json` (311 nodes from the
Coin Toss `Canvas` scene, 10/10 self-check passed), reusing the sibling
Penaldo port's architecture directly rather than reinventing it.

### Design-space stage, not CSS breakpoints

The previous build here used one CSS-breakpoint component tree
(`useResponsiveLayout` + `.layout-portrait`/`.layout-landscape`). This pass
replaces that entirely with `src/ui/Stage.tsx`: a fixed `1080x2340` div
(the scene's `CanvasScaler.referenceResolution`), `transform: scale(var(--s))`
with `--s = sqrt((vw/1080) * (vh/2340))`, recomputed by one `resize`/
`orientationchange` listener coalesced onto a single `requestAnimationFrame`
— never a React re-render. Every descendant is `position: absolute` at the
raw `rect_css` pixels from `src/ui/design.ts` (a hand-transcribed, commented
subset of the extraction, every constant citing its source node name), the
same pattern as Penaldo's `ui/design.ts`/`ui/Stage.tsx`/`ui/Sprite.tsx`.

This scene's own `CanvasScaler` is actually configured differently from the
sibling games': `m_MatchWidthOrHeight: 1` (full match-height — canvas width
elastically follows device aspect) rather than the `0.5` geometric-mean
split Penaldo/Keno use. This port deliberately keeps the shared `sqrt(...)`
convention anyway, to stay architecturally identical across the family
(same `Stage`, same `rect_css` contract) — documented as a conscious
divergence in `Stage.tsx`, not an oversight. At the primary 1080-wide
portrait target the two are pixel-identical; the difference only shows on
very wide/landscape viewports, where a literal Unity relaunch would reveal
more of the design's horizontal bleed and this port instead clips it at the
stage's own 1080px edge.

### The `Interactive Pane` bleed, and the one recentring correction

`Interactive Pane` (and everything under it — `BetPanel`, `ResultsPanel`,
`Cashout Retry`) is a *stretch* child of the scene's `Game Panel`, which is
itself only a `100x100` positioning anchor, not the real Canvas. Working
through Unity's own stretch-rect algebra, this makes the whole subtree
**always** 1360.8px wide regardless of any live-resize logic, with the
`-216`/`+64.8` split baked into the static scene file being just one
snapshot of wherever `DynamicUiManager` (attached to the neighbouring
`Responsive` node) happens to leave `Game Panel`'s width at runtime — a
value this UI-only extraction can't recover. Trusting that snapshot
literally clipped the left-most quick-bet chip (`+200`) off the visible
canvas. This port makes the one defensible call instead: split the
unavoidable 280.8px overflow evenly (140.4px each side) rather than
reproducing the file's asymmetric split. That's a single `+75.6px`
correction (`IP_X` in `design.ts`), applied once to every rect descending
from `Interactive Pane`'s coordinate space so the stake field, chips,
choice buttons, results panel and cashout-retry modal all stay mutually
aligned. Everything else in `design.ts` is the literal extracted value.

### Art-to-element mapping

The 13 sliced comp frames actually wired into the scene live in
`public/assets/ui/*.png` under descriptive names — see the `ui()` helper's
call sites in `src/components/*.tsx` for the full mapping back to
`Interface Design - Coin & Toss - mobile - N.png`. Highlights:

- `background` (frame 19) is the full-bleed illustrated altar backdrop —
  drawn 1:1 as the stage's first child, no gradient anywhere in the scene.
- `NavPanel` has exactly one interactive icon button (`MenuButton`, frame 6
  + the frame-7 hamburger glyph) — no separate Help/Bet-History icons in the
  top bar. Both of those now live inside `MenuPanel`'s three-row drawer
  (`About Button`→Help, `BetHistoryButton`, `unmute`/`mute`→a local Sound
  toggle wired to `state/sfx.ts`), matching the scene instead of the
  previous build's three invented top-bar icons.
- `ChoicePanel/Heads`+`Tails` (frames 15/16) are full glowing pill buttons,
  not a card-flip pair of plain rectangles — each carries its own "Pays 2x"
  label above the "HEAD"/"TAIL" text, both baked into `design.ts`'s `CHOICE`
  constant.
- `Game Panel/Game View` is a `RawImage` of a real render texture
  (`GameView.renderTexture`) framing a 3D `Coin` mesh with an `Animator`
  (`Coin.controller`, states `idle`/`load`/`head`/`tail`/`side`) — reproduced
  as `CoinStage.tsx`'s CSS 3D flip-card at the exact `Game View` rect
  (140, 548.664, 800x800), not a smaller ad-hoc circle.
- Every 9-slice corner radius is computed as `108 / pixelsPerUnitMultiplier`
  per element (`R` in `design.ts`), covering the multipliers actually
  present in this scene (1, 2, 3, 4, 5, 6, 8, 10) — the retry button, the
  insufficient-funds card/close button, the relaunch button, the
  notification toast, and the keypad each get their own real radius.
- Elements with `Image.m_Enabled: false` in the scene (`Interactive Pane`,
  `ManualStakeInputField`'s background `Panel`) are not drawn at all.

### Font decision

101 of the scene's 103 TMP components resolve to `LiberationSans SDF`
(TextMesh Pro's stock default); only 2 use a `Bestime SDF.asset`. `Bestime`
(the game's real display font, `Assets/Fonts/bestime/Bestime.ttf` — free for
personal + commercial use per its bundled `More Info.txt`) is self-hosted
and used as the primary display face since it's the one carrying the
design's actual character; `index.css` falls back to `Liberation Sans` /
system sans for the LiberationSans-SDF-resolved body text.

### What could not be matched exactly

- **`Square`'s `SpriteRenderer` sprite** (the `Game View` render texture's
  background plane) isn't resolved by this extraction, which only decodes
  UI `Image`/`RawImage` sprites, not arbitrary 3D `SpriteRenderer`s. The
  existing `coin-toss-bg.png`/`coin-toss-bg-wide.png` art from the initial
  build fills that role as a plausible stand-in.
- **`image.png`** — the sprite backing `MenuPanel`'s close X and its
  About/Bet-History row icons — is a multi-icon placeholder sheet in the
  source (one 128x128 texture containing an unrelated "?" bubble *and* a
  bar-chart glyph together), and the extraction doesn't decode which
  sub-region a given usage draws. Its own filename reads as a design
  placeholder rather than intentional per-context art, so purpose-fit
  stand-ins (`circle.png` tinted per row, a plain "×" glyph) are used
  instead rather than guessing at a UV rect.
- **The `MenuPanel` row icons' exact glyphs** (a chart-like icon for Bet
  History, a "?" for About, per `image.png`'s two visible sub-images) are
  therefore approximated as tinted circular badges rather than the specific
  glyphs, for the same reason as above.
- **`QuickBet`/`ChoicePanel`'s child rects** (the individual chip buttons,
  the Heads/Tails button labels' exact vertical split) serialise as
  `HorizontalLayoutGroup`-driven placeholders (`0` or negative width/height)
  in the static scene file; `design.ts` reconstructs them from the
  resolved parent rect + the layout group's own padding/spacing/count,
  documented inline at each constant rather than left as raw zeros.
- **The `Addition Button`/`Subtraction Button` steppers** are rendered at
  their exact scene geometry for pixel fidelity but are visually inert: the
  game-logic layer (out of scope for this pass) exposes only
  `addChip(amount)` for a fixed quick-bet value and the manual keypad entry,
  no generic ±1 stepper action, so wiring them would mean inventing new
  game-engine semantics rather than reskinning existing behaviour.
- **The `Interactive Pane` bleed's exact runtime width** — see the
  recentring correction above; the `+75.6px` split is a documented
  approximation, not an extracted fact.

## Verification

```bash
npm install
npm run typecheck   # tsc --noEmit — passes with zero errors
npm run build        # tsc -b && vite build — passes
npm run dev           # vite + mock server; smoke-tested via a scripted
                        # curl/node round-trip: crypto round-trip, token
                        # exchange, authenticate, place-bet -> agg-actions
                        # (confirmed valid head/tail/side outcome + correct
                        # payout math + correct balance bookkeeping across a
                        # re-authenticate), bet history, manual-actions, and
                        # language endpoints — plus a MOCK_FORCE_OUTCOME=side
                        # run confirming the coin's edge always loses
                        # regardless of the player's head/tail choice.
```

Visual verification is a headless-Chromium (Playwright) walkthrough at the
1080x2340 design resolution: idle/bet screen, mid-flip, and the win-reveal
result screen (trophy + gold "You just won…", quick-bet chips, Heads/Tails
pills, top bar) — screenshots in `docs/screenshots/`. Also note:
`LanguageProvider` was never actually wired into `src/main.tsx` since the
initial scaffold commit — every `useLanguage()` call throws without it —
fixed there rather than reproduced, since nothing renders at all otherwise.
