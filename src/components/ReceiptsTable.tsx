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

export default function ReceiptsTable({ drafts, onChange, onRemove }: ReceiptsTableProps) {
  if (drafts.length === 0) return null;

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2 text-left font-medium text-gray-500">Image</th>
            {FIELD_LABELS.map((f) => (
              <th key={f.key} className="px-3 py-2 text-left font-medium text-gray-500">
                {f.label}
              </th>
            ))}
            <th className="px-3 py-2 text-left font-medium text-gray-500">Category</th>
            <th className="px-3 py-2 text-left font-medium text-gray-500">Status</th>
            <th className="px-3 py-2"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {drafts.map((draft) => (
            <tr key={draft.id}>
              <td className="px-3 py-2">
                <div className="relative h-12 w-12 overflow-hidden rounded-md border border-gray-200">
                  <Image src={draft.imageBase64} alt={draft.fileName} fill className="object-cover" unoptimized />
                </div>
              </td>
              {FIELD_LABELS.map((f) => (
                <td key={f.key} className="px-3 py-2">
                  <input
                    type={f.type || "text"}
                    value={draft[f.key] as string}
                    onChange={(e) => onChange(draft.id, f.key, e.target.value)}
                    className="w-32 rounded-md border border-gray-200 px-2 py-1 text-sm focus:border-blue-400 focus:outline-none"
                  />
                </td>
              ))}
              <td className="px-3 py-2">
                <select
                  value={draft.category}
                  onChange={(e) => onChange(draft.id, "category", e.target.value)}
                  className="rounded-md border border-gray-200 px-2 py-1 text-sm focus:border-blue-400 focus:outline-none"
                >
                  <option value="">—</option>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </td>
              <td className="px-3 py-2">
                <StatusBadge draft={draft} />
              </td>
              <td className="px-3 py-2">
                <button
                  type="button"
                  onClick={() => onRemove(draft.id)}
                  className="text-gray-400 hover:text-red-500"
                  aria-label="Remove receipt"
                >
                  ✕
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({ draft }: { draft: ReceiptDraft }) {
  const styles: Record<ReceiptDraft["status"], string> = {
    pending: "bg-gray-100 text-gray-600",
    analyzing: "bg-blue-100 text-blue-700",
    analyzed: "bg-green-100 text-green-700",
    error: "bg-red-100 text-red-700",
  };
  const labels: Record<ReceiptDraft["status"], string> = {
    pending: "Pending",
    analyzing: "Analyzing…",
    analyzed: "Analyzed",
    error: "Error",
  };

  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${styles[draft.status]}`}
      title={draft.error}
    >
      {labels[draft.status]}
    </span>
  );
}
