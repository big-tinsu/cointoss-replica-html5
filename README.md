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
| `DynamicUiManager.cs` — Desktop/Mobile scene distinction | `src/hooks/useResponsiveLayout.ts` + `.layout-portrait`/`.layout-landscape` CSS (one component tree, no scene reload) |
| `GameManager.DisplayOrientationMessage`/orientation prefabs — **the one real orientation overlay of the three sibling games** | `src/hooks/useOrientationGuard.ts` + `src/components/OrientationOverlay.tsx` (reactive `matchMedia`, not a polling loop) |
| `Assets/Animations/Game/{head,tail,side,load,idle}.anim` | `data-anim` attribute + the identically-named CSS `@keyframes` in `src/components/CoinStage.tsx`/`index.css` |
| `PlayConfetti.cs` (dormant) | `src/components/ConfettiBurst.tsx` — small CSS celebration, see below |

### Layout fidelity

`DynamicUiManager` in the Unity source ships two full static scenes
(`Desktop.unity`/`Mobile.unity`), but the actual scene-swap machinery has
zero call sites anywhere (confirmed dead code, spec §5) — the two scenes are
never live-swapped by Unity itself either. Per the spec's explicit
recommendation, this port builds ONE responsive component tree with CSS
breakpoints reacting live to viewport shape (`useResponsiveLayout`), not two
divergent trees. Same for bet history: one `BetHistoryPanel` component whose
desktop-table vs. mobile-cards presentation is chosen purely by a CSS media
query over the same DOM (matching Keno's architecture, not Penaldo's two
parallel implementations).

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

## Orientation overlay (real here, unlike the sibling games)

`src/hooks/useOrientationGuard.ts` computes an "expected device" once at
mount (mirroring `DynamicUiManager.CheckDeviceType()`'s
`Screen.width < Screen.height` aspect check), then reactively compares it
against the live orientation via `matchMedia('(orientation: portrait)')`
change events — not a per-frame polling loop, since the spec itself flags
`Update()`-polling as a game-loop pattern not to replicate literally in a
non-game-loop web app. `OrientationOverlay.tsx` shows a "please rotate your
device" message on mismatch, using the exact localized copy from the source.

## Assets

Copied from `cointoss-aggregator-v2026/Assets` into `public/` (`.meta`,
`.DS_Store`, and `~`-suffixed/`.kra` Krita source/backup files skipped):

- `assets/img/` — coin faces (`heads.png`/`tails.png`/`side.png`), background
  art, UI chrome, mute/unmute icons, `win-art.png`, the brand banner.
- `assets/handtoss/` — the 5-frame hand/coin-toss gesture sequence.
- `assets/sound/button-click.wav` — see "Sound" above.
- `fonts/Bestime.ttf` — see "Font" above.
- `reference/` — the 22 real "Interface Design - Coin & Toss" mockup
  PNGs/JPGs (1 desktop + 19 mobile comps + 2 reference photos), copied
  verbatim as designer reference, not runtime assets the app loads.

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
