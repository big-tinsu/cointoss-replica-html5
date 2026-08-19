import { useLanguage } from "../i18n/LanguageContext";
import type { BetRecordData, Pagination } from "../api/types";

const BASE = import.meta.env.BASE_URL;

/** `CoinTossBetHistoryManager.cs:85-90` (spec §3) — outcome sprite is chosen
 * by a `.Contains("head")`/`.Contains("tail")`/else-fallback string check,
 * NOT an exact match — so any unrecognized `generatedOutcome` string also
 * silently renders as the "side" sprite. Reproduced faithfully (not
 * hardened) since the task calls this out as a quirk worth replicating. */
function outcomeSpriteKey(outcome: string): "heads" | "tails" | "side" {
  const lower = outcome.toLowerCase();
  if (lower.includes("head")) return "heads";
  if (lower.includes("tail")) return "tails";
  return "side";
}

function statusClass(result: string): string {
  // `(0.23,0.56,0.24)` green for "won", `(0.44,0.06,0.04)` dark red otherwise
  // — applied to the status badge background, not the text color itself
  // (`CoinTossBetHistoryManager.cs:77-80`).
  return result === "won" ? "status-badge status-won" : "status-badge status-lost";
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

/**
 * `CoinTossBetHistoryManager`/`CoinTossBetRecord` (spec §3) — ONE component
 * for both desktop and mobile presentation (like Keno, not Penaldo's two
 * parallel implementations), per the shared architectural recommendation
 * across all three specs: the same rows render as a table on wide layouts
 * and stacked cards on narrow ones, switched purely by CSS.
 *
 * Fields match `CoinTossBetRecord`'s row contract: date, status (tinted),
 * stake, outcome (sprite + text). Cashout amount is additionally shown here
 * since it's present on the wire (`BetRecordData.cashoutAmount`) even though
 * the source's row prefab has no dedicated cashout label — a reasonable
 * design addition, noted in the README.
 */
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
  if (!visible) return null;

  const rows = history.filter((r) => r.selectedEventType !== null);

  return (
    <div className="modal-backdrop">
      <div className="modal-panel bet-history-panel">
        <header className="bet-history-header">
          <h2>{t("Bet History")}</h2>
          <button type="button" onClick={onClose} aria-label={t("Close")}>
            ×
          </button>
        </header>

        {rows.length === 0 ? (
          <p className="no-bets">
            {loading ? "…" : t("No bet history to display")}
            <br />
            {!loading && t("Start a game to display bet history")}
          </p>
        ) : (
          <>
            <table className="bet-history-table">
              <thead>
                <tr>
                  <th>{t("Date")}</th>
                  <th>{t("Status")}</th>
                  <th>{t("Stake")}</th>
                  <th>{t("Game Outcome")}</th>
                  <th>{t("Pay")}</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((record, i) => {
                  const outcome = outcomeOf(record);
                  const sprite = outcome ? outcomeSpriteKey(outcome) : "side";
                  return (
                    <tr key={i}>
                      <td>{formatDate(record.selectedEventType?.[0]?.betTime)}</td>
                      <td>
                        <span className={statusClass(record.result)}>{t(record.result)}</span>
                      </td>
                      <td>
                        {currency} {record.amountPlaced.toFixed(2)}
                      </td>
                      <td className="outcome-cell">
                        <img src={`${BASE}assets/img/${sprite}.png`} alt="" />
                        {outcome ? t(outcome) : "—"}
                      </td>
                      <td>
                        {currency} {record.cashoutAmount.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <ul className="bet-history-cards">
              {rows.map((record, i) => {
                const outcome = outcomeOf(record);
                const sprite = outcome ? outcomeSpriteKey(outcome) : "side";
                return (
                  <li key={i} className="bet-history-card">
                    <div className="bet-history-card-row">
                      <span className={statusClass(record.result)}>{t(record.result)}</span>
                      <span>{formatDate(record.selectedEventType?.[0]?.betTime)}</span>
                    </div>
                    <div className="bet-history-card-row">
                      <span>
                        {t("Stake")}: {currency} {record.amountPlaced.toFixed(2)}
                      </span>
                      <span className="outcome-cell">
                        <img src={`${BASE}assets/img/${sprite}.png`} alt="" />
                        {outcome ? t(outcome) : "—"}
                      </span>
                    </div>
                    <div className="bet-history-card-row">
                      <span>
                        {t("Pay")}: {currency} {record.cashoutAmount.toFixed(2)}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}

        {pagination && pagination.totalPages > 1 && (
          <div className="pagination">
            <button
              type="button"
              disabled={pagination.currentPage <= 1}
              onClick={() => onPageChange(pagination.currentPage - 1)}
            >
              ‹
            </button>
            <span>
              {pagination.currentPage} / {pagination.totalPages}
            </span>
            <button
              type="button"
              disabled={pagination.currentPage >= pagination.totalPages}
              onClick={() => onPageChange(pagination.currentPage + 1)}
            >
              ›
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
