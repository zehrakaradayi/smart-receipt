"use client";

import Image from "next/image";
import { CATEGORIES } from "@/lib/categories";
import type { ReceiptDraft } from "@/lib/types";

interface ReceiptsTableProps {
  drafts: ReceiptDraft[];
  onChange: (id: string, field: keyof ReceiptDraft, value: string) => void;
  onRemove: (id: string) => void;
}

const FIELD_LABELS: { key: keyof ReceiptDraft; label: string; type?: string }[] = [
  { key: "merchant", label: "Merchant" },
  { key: "date", label: "Date", type: "date" },
  { key: "time", label: "Time", type: "time" },
  { key: "total", label: "Total", type: "number" },
  { key: "currency", label: "Currency" },
  { key: "tax", label: "Tax / VAT", type: "number" },
  { key: "bankName", label: "Bank Name" },
  { key: "items", label: "Items" },
];

const inputClasses =
  "w-32 rounded-md border border-hairline-strong bg-surface px-2 py-1.5 text-sm text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-soft";

export default function ReceiptsTable({ drafts, onChange, onRemove }: ReceiptsTableProps) {
  if (drafts.length === 0) return null;

  return (
    <>
      {/* Desktop / tablet: full table */}
      <div className="hidden overflow-x-auto rounded-xl border border-hairline bg-surface shadow-sm sm:block">
        <table className="min-w-full divide-y divide-hairline text-sm">
          <thead className="bg-surface-alt">
            <tr>
              <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">
                Image
              </th>
              {FIELD_LABELS.map((f) => (
                <th key={f.key} className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">
                  {f.label}
                </th>
              ))}
              <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">
                Category
              </th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-ink-muted">
                Status
              </th>
              <th className="px-3 py-2.5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {drafts.map((draft) => (
              <tr key={draft.id} className="align-top">
                <td className="px-3 py-3">
                  <div className="relative h-12 w-12 overflow-hidden rounded-md border border-hairline">
                    <Image src={draft.imageBase64} alt={draft.fileName} fill className="object-cover" unoptimized />
                  </div>
                </td>
                {FIELD_LABELS.map((f) => (
                  <td key={f.key} className="px-3 py-3">
                    <input
                      type={f.type || "text"}
                      value={draft[f.key] as string}
                      onChange={(e) => onChange(draft.id, f.key, e.target.value)}
                      className={inputClasses}
                    />
                  </td>
                ))}
                <td className="px-3 py-3">
                  <CategorySelect draft={draft} onChange={onChange} />
                </td>
                <td className="px-3 py-3">
                  <StatusBadge draft={draft} />
                  {draft.status === "error" && draft.error && (
                    <p className="mt-1 max-w-[10rem] text-[11px] leading-snug text-red-600">{draft.error}</p>
                  )}
                </td>
                <td className="px-3 py-3">
                  <RemoveButton draftId={draft.id} onRemove={onRemove} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: stacked cards */}
      <div className="flex flex-col gap-3 sm:hidden">
        {drafts.map((draft) => (
          <div key={draft.id} className="rounded-xl border border-hairline bg-surface p-3 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md border border-hairline">
                <Image src={draft.imageBase64} alt={draft.fileName} fill className="object-cover" unoptimized />
              </div>
              <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                <StatusBadge draft={draft} />
                <RemoveButton draftId={draft.id} onRemove={onRemove} />
              </div>
            </div>
            {draft.status === "error" && draft.error && (
              <p className="mt-1 text-xs text-red-600">{draft.error}</p>
            )}

            <div className="mt-3 grid grid-cols-2 gap-2.5">
              {FIELD_LABELS.map((f) => (
                <label key={f.key} className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-ink-muted">{f.label}</span>
                  <input
                    type={f.type || "text"}
                    value={draft[f.key] as string}
                    onChange={(e) => onChange(draft.id, f.key, e.target.value)}
                    className="w-full rounded-md border border-hairline-strong bg-surface px-2 py-1.5 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-soft"
                  />
                </label>
              ))}
              <label className="col-span-2 flex flex-col gap-1">
                <span className="text-xs font-medium text-ink-muted">Category</span>
                <CategorySelect draft={draft} onChange={onChange} full />
              </label>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function CategorySelect({
  draft,
  onChange,
  full,
}: {
  draft: ReceiptDraft;
  onChange: (id: string, field: keyof ReceiptDraft, value: string) => void;
  full?: boolean;
}) {
  return (
    <select
      value={draft.category}
      onChange={(e) => onChange(draft.id, "category", e.target.value)}
      className={`rounded-md border border-hairline-strong bg-surface px-2 py-1.5 text-sm text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-soft ${
        full ? "w-full" : ""
      }`}
    >
      <option value="">—</option>
      {CATEGORIES.map((c) => (
        <option key={c} value={c}>
          {c}
        </option>
      ))}
    </select>
  );
}

function RemoveButton({ draftId, onRemove }: { draftId: string; onRemove: (id: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onRemove(draftId)}
      className="rounded-md p-1.5 text-ink-faint transition-colors hover:bg-red-50 hover:text-red-600"
      aria-label="Remove receipt"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
      </svg>
    </button>
  );
}

function StatusBadge({ draft }: { draft: ReceiptDraft }) {
  const styles: Record<ReceiptDraft["status"], string> = {
    pending: "bg-surface-alt text-ink-muted",
    analyzing: "bg-sky-50 text-sky-700",
    analyzed: "bg-emerald-50 text-emerald-700",
    error: "bg-red-50 text-red-700",
  };
  const labels: Record<ReceiptDraft["status"], string> = {
    pending: "Pending",
    analyzing: "Analyzing…",
    analyzed: "Analyzed",
    error: "Error",
  };

  return (
    <span
      className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${styles[draft.status]}`}
      title={draft.error}
    >
      {labels[draft.status]}
    </span>
  );
}
