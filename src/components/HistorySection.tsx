"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { HistoryReceipt } from "@/lib/types";

export default function HistorySection() {
  const [receipts, setReceipts] = useState<HistoryReceipt[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/receipts")
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (!data.success) throw new Error(data.error || "Geçmiş kayıtlar alınamadı.");
        setReceipts(data.receipts || []);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Geçmiş kayıtlar alınamadı.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-base font-semibold text-ink">Geçmiş Kayıtlar</h2>

      {loading && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex gap-3 rounded-xl border border-hairline bg-surface p-3">
              <div className="h-16 w-16 shrink-0 animate-pulse rounded-md bg-surface-alt" />
              <div className="flex flex-1 flex-col gap-2 py-1">
                <div className="h-3.5 w-2/3 animate-pulse rounded bg-surface-alt" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-surface-alt" />
                <div className="h-3.5 w-1/3 animate-pulse rounded bg-surface-alt" />
              </div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-800">{error}</div>
      )}

      {!loading && !error && receipts.length === 0 && (
        <div className="flex flex-col items-center gap-1 rounded-xl border border-dashed border-hairline-strong bg-surface-alt px-4 py-8 text-center">
          <p className="text-sm font-medium text-ink">Henüz kaydedilmiş fiş yok.</p>
          <p className="text-xs text-ink-muted">Gönderdiğin fişler burada görünecek.</p>
        </div>
      )}

      {!loading && !error && receipts.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {receipts.map((r, idx) => (
            <div
              key={idx}
              className="flex gap-3 rounded-xl border border-hairline bg-surface p-3 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md border border-hairline bg-surface-alt">
                {r.imageUrl ? (
                  <Image
                    src={r.imageUrl}
                    alt={r.merchant}
                    fill
                    className="object-cover"
                    unoptimized
                    referrerPolicy="no-referrer"
                  />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">{r.merchant || "—"}</p>
                <p className="text-xs text-ink-muted">
                  {r.date} {r.time}
                </p>
                {r.category && (
                  <span className="mt-1 inline-block rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent-hover">
                    {r.category}
                  </span>
                )}
                <p className="mt-1 font-mono text-sm font-semibold text-ink">
                  {r.total} {r.currency}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
