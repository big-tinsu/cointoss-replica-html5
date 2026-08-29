import { useLanguage } from "../i18n/LanguageContext";
import type { BetRecordData, Pagination } from "../api/types";
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

function outcomeOf(record: BetRecordData): string | null {
  const events = record.selectedEventType;
  if (!events || events.length === 0) return null;
  return events[0].generatedOutcome;
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
    const outcome = outcomeOf(record);
    const sprite = outcome ? outcomeSpriteKey(outcome) : "side";
    return {
      key: `${i}`,
      status: statusOf(record.result),
      statusLabel: t(record.result),
      date: formatDate(record.selectedEventType?.[0]?.betTime),
      stake: `${t("Stake")}: ${currency} ${record.amountPlaced.toFixed(2)}`,
      payout: `${t("Cashout")}: ${currency} ${record.cashoutAmount.toFixed(2)}`,
      detail: outcome ? t(outcome) : undefined,
      outcome: (
        <img
          src={img(sprite)}
          alt=""
          width={coinSize}
          height={coinSize}
          style={{ width: coinSize, height: coinSize, objectFit: "contain", display: "block" }}
        />
      ),
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
