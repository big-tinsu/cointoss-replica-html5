import { assetUrl } from "../assetUrl";

/**
 * Registers `Bestime` (the game's real display font, `public/fonts`).
 *
 * This lives here rather than as an `@font-face` in `index.css` because a
 * CSS `url()` is a literal — it cannot call `assetUrl`, so a stylesheet
 * reference would freeze the font at a build-time path and 404 under a
 * proxy that mounts the game at a sub-path. `tools/wrap-asset-urls.mjs`
 * fails the build if a stylesheet reintroduces one.
 *
 * The font is a headline flourish (two Header/logo-adjacent labels); the
 * system sans stack in `index.css` covers everything else, so a failed load
 * degrades silently rather than blocking the boot screen.
 */
export function installFonts(): void {
  if (typeof document === "undefined" || !("fonts" in document)) return;
  try {
    const face = new FontFace(
      "Bestime",
      `url("${assetUrl("fonts/Bestime.ttf")}") format("truetype")`,
      { display: "swap" },
    );
    void face
      .load()
      .then((loaded) => document.fonts.add(loaded))
      .catch(() => undefined);
  } catch {
    /* no FontFace constructor — the fallback stack still renders. */
  }
}
