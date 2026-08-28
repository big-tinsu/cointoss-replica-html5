import { metrics } from "./tokens";
import type { UMetrics } from "./tokens";

/** The game's canvas reference resolution — the kit's only layout input. */
export type Canvas = { refW: number; refH: number };

/**
 * Resolve the unified metrics for a game's canvas.
 *
 * Split out of `primitives.tsx` so that file only exports components (React
 * Fast Refresh warns otherwise).
 */
export function useUnified(canvas: Canvas): UMetrics {
  return metrics(canvas.refW, canvas.refH);
}
