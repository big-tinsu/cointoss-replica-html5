import { useLanguage } from "../i18n/LanguageContext";
import { outcomeEvents } from "../api/types";
import type { BetRecordData, OutcomeResult, Pagination } from "../api/types";
import { img } from "../ui/design";
import { UnifiedBetHistory } from "../ui/unified";
import type { UBetRow } from "../ui/unified";

/**
 * Adapter onto the shared `UnifiedBetHistory` (see `src/ui/unified/`).
 *
 * Row chrome, palette and type scale are shared with the other ten games;
 * the OUTCOME art stays Coin Toss's own — the heads/tails/side sprite chosen
 * by `CoinTossBetHistoryManager.cs:85-90`.
 *
 * The scene's own green/dark-red status badge is dropped in favour of the
 * kit's shared won/lost/pending colour, which is the point of unifying.
 */
function outcomeSpriteKey(outcome: string): "heads" | "tails" | "side" {
  const lower = outcome.toLowerCase();
  if (lower.includes("head")) return "heads";
  if (lower.includes("tail")) return "tails";
  return "side";
}

function statusOf(result: string): UBetRow["status"] {
  if (result === "won") return "won";
  if (result === "lost") return "lost";
  return "pending";
}

function formatDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** The row's resolved event, or `null` when the backend sent the string/number
 * form of `selectedEventType` (spec §5.6) — see `outcomeEvents`. */
function eventOf(record: BetRecordData): OutcomeResult | null {
  return outcomeEvents(record.selectedEventType)?.[0] ?? null;
}

export function BetHistoryPanel({
  visible,
  history,
  pagination,
  loading,
  currency,
  onClose,
  onPageChange,
}: {
  visible: boolean;
  history: BetRecordData[];
  pagination: Pagination | null;
  loading: boolean;
  currency: string;
  onClose: () => void;
  onPageChange: (page: number) => void;
}) {
  const { t } = useLanguage();

  // Face icon size, in real px like the rest of the shared row.
  const coinSize = 26;

  const rows: UBetRow[] = history.map((record, i) => {
    const event = eventOf(record);
    const outcome = event?.generatedOutcome ?? null;
    return {
      key: `${i}`,
      status: statusOf(record.result),
      statusLabel: t(record.result),
      date: formatDate(event?.betTime),
      stake: `${t("Stake")}: ${currency} ${Number(record.amountPlaced).toFixed(2)}`,
      payout: `${t("Cashout")}: ${currency} ${Number(record.cashoutAmount).toFixed(2)}`,
      detail: outcome ? t(outcome) : undefined,
      // No coin face when the row carries no readable event: showing the
      // `side` sprite there would claim an edge landing that never happened.
      outcome: outcome ? (
        <img
          src={img(outcomeSpriteKey(outcome))}
          alt=""
          width={coinSize}
          height={coinSize}
          style={{
            width: coinSize,
            height: coinSize,
            objectFit: "contain",
            display: "block",
          }}
        />
      ) : undefined,
    };
  });

  return (
    <UnifiedBetHistory
      visible={visible}
      rows={rows}
      loading={loading}
      page={pagination?.currentPage}
      totalPages={pagination?.totalPages}
      onPageChange={onPageChange}
      onClose={onClose}
      t={t}
    />
  );
}
