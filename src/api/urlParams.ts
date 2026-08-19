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
