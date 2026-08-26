/**
 * Mirrors `URLParameters.cs` + the parsing in `GameLoader.LoadAll`
 * (`GameLoader.cs:68-99`, spec §1 step 2 / §4). Coin Toss reads different
 * query keys than Penaldo/Keno: `language` (not `lang`), `replayMode`,
 * `roundId` (both new to this game, and both only ever drive the confirmed
 * non-functional replay path — see README "What was skipped").
 */
export interface LaunchParams {
  language: string;
  replayMode: boolean;
  roundId: string | null;
}

export function getLaunchParams(search: string = window.location.search): LaunchParams {
  const params = new URLSearchParams(search);
  return {
    language: params.get("language") ?? "en",
    replayMode: (params.get("replayMode") ?? "false").toLowerCase() === "true",
    roundId: params.get("roundId"),
  };
}

/**
 * Not part of the Unity source — a deploy-time escape hatch for previewing a
 * built game without a working aggregator.
 *
 * `?mock=1` points the whole backend contract at this origin's bundled mock
 * (`api/mock.js`, the same Express app `npm run dev` uses) instead of
 * `portal.shacksevo.co`, so the build boots and plays against a fake wallet
 * with no `clientId` and no real credentials. Opt-in only: without the flag a
 * launch behaves exactly as before.
 *
 * Deliberately NOT stripped by `hrefWithoutReplayKeys()` below — the mock
 * ignores the encrypted URL's contents entirely, so leaving the key in the
 * ciphertext is harmless and keeps that function faithful to the source's own
 * `StripKey` behaviour (which only ever removes `replayMode`/`roundId`).
 */
export function isMockBackend(search: string = window.location.search): boolean {
  return new URLSearchParams(search).get("mock") === "1";
}

/**
 * `GameLoader.RunTokenAndAuth`'s `StripKey(URLParameters.Href, ...)`
 * (`GameLoader.cs:150-151,517-539`): the token exchange payload is the whole
 * page URL, minus the `replayMode`/`roundId` query keys specifically (every
 * other param, including `language`, is kept).
 */
export function hrefWithoutReplayKeys(href: string = window.location.href): string {
  const url = new URL(href);
  url.searchParams.delete("replayMode");
  url.searchParams.delete("roundId");
  return url.toString();
}
