import { useLanguage } from "../i18n/LanguageContext";
import { playClick } from "../state/sfx";
import type { BetRecordData, Pagination } from "../api/types";
import { C, img } from "../ui/design";
import { Spr, Tmp } from "../ui/Sprite";

import { useDesign } from "../ui/DesignContext";
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

/** `(0.23,0.56,0.24)` green for "won", `(0.44,0.06,0.04)` dark red otherwise
 * — applied to the status badge background (`CoinTossBetHistoryManager.
 * cs:77-80`). */
function statusColor(result: string): string {
  return result === "won" ? "rgb(59, 143, 61)" : "rgb(112, 15, 10)";
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
 * `Bet History` (spec §3) — a full-screen `#2F1D52` panel (not a modal card
 * like the sibling ports), header + close + prev/next arrows resolved
 * directly from the scene; rows are instantiated at runtime from a prefab
 * (not authored in the scene) so their geometry is a reasonable
 * reconstruction from the header's column layout (see `design.ts`
 * `BET_HISTORY`).
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
  const { BET_HISTORY } = useDesign();
  const { t } = useLanguage();
  if (!visible) return null;

  const rows = history.filter((r) => r.selectedEventType !== null);

  return (
    <div className="modal-fade">
      <div className="node" style={{ left: 0, top: 0, width: 1080, height: 2340, background: C.historyPurple }} />

      <Tmp rect={BET_HISTORY.header} fontSize={BET_HISTORY.header.fs} color={C.white} bold>
        {t("Bet History")}
      </Tmp>
      <button
        type="button"
        className="btn press"
        style={{ left: BET_HISTORY.back.x, top: BET_HISTORY.back.y, width: BET_HISTORY.back.w, height: BET_HISTORY.back.h }}
        onClick={() => {
          playClick();
          onClose();
        }}
        aria-label={t("Close")}
      >
        <Spr src={img("arrow-1-w")} rect={{ x: 0, y: 0, w: BET_HISTORY.back.w, h: BET_HISTORY.back.h }} />
      </button>

      {rows.length === 0 ? (
        <>
          <div
            className="node"
            style={{
              left: BET_HISTORY.emptyCard.x,
              top: BET_HISTORY.emptyCard.y,
              width: BET_HISTORY.emptyCard.w,
              height: BET_HISTORY.emptyCard.h,
              background: C.historyCardPurple,
              borderRadius: 24,
            }}
          />
          <Spr src={img("bug")} rect={BET_HISTORY.emptyBug} />
          <Tmp rect={BET_HISTORY.emptyTitle} fontSize={BET_HISTORY.emptyTitle.fs} color={C.historyNoBetsGrey}>
            {loading ? "…" : t("No bet history to display")}
          </Tmp>
          {!loading && (
            <Tmp rect={BET_HISTORY.emptySubtitle} fontSize={BET_HISTORY.emptySubtitle.fs} color={C.black}>
              {t("Start a game to display bet history")}
            </Tmp>
          )}
        </>
      ) : (
        <div className="node scroll-y" style={{ left: BET_HISTORY.scroll.x, top: BET_HISTORY.scroll.y, width: BET_HISTORY.scroll.w, height: BET_HISTORY.scroll.h }}>
          {rows.map((record, i) => {
            const outcome = outcomeOf(record);
            const sprite = outcome ? outcomeSpriteKey(outcome) : "side";
            const top = i * BET_HISTORY.rowPitch;
            return (
              <div key={i} className="node" style={{ left: 0, top, width: BET_HISTORY.scroll.w, height: BET_HISTORY.rowH }}>
                <span
                  style={{
                    position: "absolute",
                    left: 0,
                    top: 0,
                    fontSize: BET_HISTORY.rowFs,
                    color: C.white,
                    width: 220,
                  }}
                >
                  {formatDate(record.selectedEventType?.[0]?.betTime)}
                </span>
                <span
                  style={{
                    position: "absolute",
                    left: 220,
                    top: 0,
                    fontSize: BET_HISTORY.rowFs * 0.85,
                    color: C.white,
                    background: statusColor(record.result),
                    padding: "4px 16px",
                    borderRadius: 999,
                  }}
                >
                  {t(record.result)}
                </span>
                <span style={{ position: "absolute", left: 430, top: 0, fontSize: BET_HISTORY.rowFs, color: C.white }}>
                  {currency} {record.amountPlaced.toFixed(2)}
                </span>
                <span
                  style={{
                    position: "absolute",
                    left: 620,
                    top: 0,
                    fontSize: BET_HISTORY.rowFs,
                    color: C.white,
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <img src={img(sprite)} alt="" width={40} height={40} style={{ objectFit: "contain" }} />
                  {outcome ? t(outcome) : "—"}
                </span>
                <span style={{ position: "absolute", left: 850, top: 0, fontSize: BET_HISTORY.rowFs, color: C.gold }}>
                  {currency} {record.cashoutAmount.toFixed(2)}
                </span>
              </div>
            );
          })}
        </div>
      )}

      {pagination && pagination.totalPages > 1 && (
        <>
          <button
            type="button"
            className="btn press"
            style={{ left: BET_HISTORY.prev.x, top: BET_HISTORY.prev.y, width: BET_HISTORY.prev.w, height: BET_HISTORY.prev.h }}
            disabled={pagination.currentPage <= 1}
            onClick={() => {
              playClick();
              onPageChange(pagination.currentPage - 1);
            }}
          >
            <Spr src={img("arrow-1-w")} rect={{ x: 0, y: 0, w: BET_HISTORY.prev.w, h: BET_HISTORY.prev.h }} />
          </button>
          <Tmp
            rect={{ x: BET_HISTORY.prev.x + BET_HISTORY.prev.w, y: BET_HISTORY.prev.y, w: BET_HISTORY.next.x - (BET_HISTORY.prev.x + BET_HISTORY.prev.w), h: BET_HISTORY.prev.h }}
            fontSize={32}
            color={C.white}
          >
            {pagination.currentPage} / {pagination.totalPages}
          </Tmp>
          <button
            type="button"
            className="btn press"
            style={{ left: BET_HISTORY.next.x, top: BET_HISTORY.next.y, width: BET_HISTORY.next.w, height: BET_HISTORY.next.h }}
            disabled={pagination.currentPage >= pagination.totalPages}
            onClick={() => {
              playClick();
              onPageChange(pagination.currentPage + 1);
            }}
          >
            <Spr src={img("arrow-1-e")} rect={{ x: 0, y: 0, w: BET_HISTORY.next.w, h: BET_HISTORY.next.h }} />
          </button>
        </>
      )}
    </div>
  );
}
