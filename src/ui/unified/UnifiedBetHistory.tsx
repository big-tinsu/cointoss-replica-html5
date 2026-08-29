import type { ReactNode } from "react";
import { U } from "./tokens";
import { ACCENT } from "./accent";
import { UBody, UEmpty, UHeader, UOverlay, USurface } from "./primitives";
import { useUnified } from "./scale";
import { UChevronLeftIcon, UChevronRightIcon, UEmptyIcon } from "./icons";

/**
 * One history row, normalised.
 *
 * Each game's API returns its own record shape (Diced has three
 * `generatedSides`, Coin Toss a single face, Cards a hand), so the adapter in
 * each repo maps its records onto this. `outcome` is the one deliberately
 * game-specific slot: the row CHROME is identical everywhere, while the
 * outcome art stays native to the game — a shared row that rendered dice in
 * Penaldo would be worse, not more consistent.
 */
export type UBetRow = {
  key: string;
  status: "won" | "lost" | "pending";
  statusLabel: string;
  date: string;
  /** Preformatted, currency included. */
  stake: string;
  payout?: string;
  detail?: string;
  /**
   * Extra label/value pairs, rendered as a compact grid under the main
   * lines. Verbose games (Keno records carry selected numbers, matched
   * numbers and a second side bet) keep every field they had rather than
   * losing data to the shared row.
   */
  fields?: [string, string][];
  outcome?: ReactNode;
};

const STATUS_COLOR: Record<UBetRow["status"], string> = {
  won: U.won,
  lost: U.lost,
  pending: U.pending,
};

/** Unified bet-history page — identical in all eleven games. */
export function UnifiedBetHistory({
  visible,
  rows,
  loading,
  error,
  page,
  totalPages,
  onPageChange,
  onClose,
  t = (s) => s,
}: {
  visible: boolean;
  rows: UBetRow[];
  loading?: boolean;
  /** Shown in place of the empty state when a fetch failed. */
  error?: string;
  page?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  onClose: () => void;
  t?: (s: string) => string;
}) {
  const m = useUnified();
  if (!visible) return null;

  const paged = !!(page && totalPages && totalPages > 1 && onPageChange);

  return (
    <UOverlay onDismiss={onClose} align="center" zIndex={80} label={t("Bet History")}>
      <USurface m={m} variant="page">
        <UHeader m={m} title={t("Bet History")} onClose={onClose} icon="back" closeLabel={t("Close")} />

        {rows.length === 0 ? (
          <UEmpty
            m={m}
            icon={<UEmptyIcon size={64} color={error ? U.lost : U.textFaint} />}
            title={error ? t(error) : loading ? "…" : t("No bet history to display")}
            hint={error || loading ? undefined : t("Start a game to display bet history")}
          />
        ) : (
          <UBody m={m}>
            {rows.map((row) => (
              <div
                key={row.key}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: m.sp.md,
                  padding: m.sp.md,
                  background: U.surfaceRaised,
                  border: `1px solid ${U.border}`,
                  borderRadius: m.radius.md,
                }}
              >
                <div
                  style={{
                    flex: "1 1 auto",
                    minWidth: 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: m.sp.xs * 0.5,
                  }}
                >
                  <span
                    style={{
                      fontSize: m.fs.label,
                      fontWeight: 700,
                      color: STATUS_COLOR[row.status],
                      textTransform: "capitalize",
                    }}
                  >
                    {row.statusLabel}
                  </span>
                  <span style={{ fontSize: m.fs.caption, color: U.text }}>{row.stake}</span>
                  {row.payout && (
                    <span style={{ fontSize: m.fs.caption, color: U.textDim }}>{row.payout}</span>
                  )}
                  {row.detail && (
                    <span style={{ fontSize: m.fs.micro, color: U.textDim }}>{row.detail}</span>
                  )}
                  {row.fields && row.fields.length > 0 && (
                    <span
                      style={{
                        display: "grid",
                        gridTemplateColumns: "auto 1fr",
                        columnGap: m.sp.sm,
                        rowGap: m.sp.xs * 0.5,
                        marginTop: m.sp.xs * 0.5,
                      }}
                    >
                      {row.fields.map(([label, value], k) => (
                        <span key={k} style={{ display: "contents" }}>
                          <span style={{ fontSize: m.fs.micro, color: U.textFaint }}>{label}</span>
                          <span style={{ fontSize: m.fs.micro, color: U.text, wordBreak: "break-word" }}>
                            {value}
                          </span>
                        </span>
                      ))}
                    </span>
                  )}
                  <span style={{ fontSize: m.fs.micro, color: U.textFaint }}>{row.date}</span>
                </div>
                {row.outcome && <div style={{ flex: "0 0 auto" }}>{row.outcome}</div>}
              </div>
            ))}
          </UBody>
        )}

        {paged && (
          <div
            style={{
              flex: "0 0 auto",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: m.sp.md,
              padding: `${m.sp.sm}px ${m.sp.md}px`,
              borderTop: `1px solid ${U.border}`,
            }}
          >
            <PageBtn
              m={m}
              label={t("Previous page")}
              disabled={page! <= 1}
              onClick={() => onPageChange!(page! - 1)}
            >
              <UChevronLeftIcon size={m.fs.body} color={U.text} />
            </PageBtn>
            <span style={{ fontSize: m.fs.caption, color: U.textDim }}>
              {page} / {totalPages}
            </span>
            <PageBtn
              m={m}
              label={t("Next page")}
              disabled={page! >= totalPages!}
              onClick={() => onPageChange!(page! + 1)}
            >
              <UChevronRightIcon size={m.fs.body} color={U.text} />
            </PageBtn>
          </div>
        )}
      </USurface>
    </UOverlay>
  );
}

function PageBtn({
  m,
  label,
  disabled,
  onClick,
  children,
}: {
  m: ReturnType<typeof useUnified>;
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className="u-btn u-press"
      disabled={disabled}
      onClick={onClick}
      aria-label={label}
      style={{
        position: "static",
        display: "grid",
        placeItems: "center",
        width: m.tap,
        height: m.tap,
        borderRadius: m.radius.sm,
        border: `1px solid ${disabled ? U.border : ACCENT}`,
        background: "transparent",
        opacity: disabled ? 0.35 : 1,
      }}
    >
      {children}
    </button>
  );
}
