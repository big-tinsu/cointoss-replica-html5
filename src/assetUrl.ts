/*
 * The single resolver for every file this game ships in `public/`.
 *
 * Vite rewrites imported assets for you, but `public/` is copied verbatim —
 * nothing rewrites those URLs, so they have to be built at runtime. Under a
 * proxy that mounts the game at a sub-path, `VITE_BASE_PATH` (the same
 * variable `vite.config.ts` uses for `base`) is that prefix.
 *
 * Set it WITHOUT a trailing slash: the join below adds one, so
 * "/games/cointoss/" would produce a doubled separator.
 *
 * `tools/wrap-asset-urls.mjs` (the `prebuild` hook) enforces that every
 * `public/` reference in `src/` goes through this function.
 */

// Whether asset URLs should be prefixed with a leading slash (e.g.
// "/logo.png"). Defaults to false, i.e. relative paths like "logo.png".
const VITE_BASE_PATH = import.meta.env.VITE_BASE_PATH;

export const assetUrl = (path: string): string => {
  const normalized = path.replace(/^\/+/, "");
  return VITE_BASE_PATH ? `${VITE_BASE_PATH}/${normalized}` : normalized;
};
