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
    <section>
      <h2 className="mb-3 text-lg font-semibold text-gray-900">Geçmiş Kayıtlar</h2>

      {loading && <p className="text-sm text-gray-500">Yükleniyor…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!loading && !error && receipts.length === 0 && (
        <p className="text-sm text-gray-500">Henüz kaydedilmiş fiş yok.</p>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {receipts.map((r, idx) => (
          <div key={idx} className="flex gap-3 rounded-xl border border-gray-200 p-3">
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md border border-gray-200 bg-gray-50">
              {r.imageUrl ? (
                <Image src={r.imageUrl} alt={r.merchant} fill className="object-cover" unoptimized />
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-900">{r.merchant || "—"}</p>
              <p className="text-xs text-gray-500">
                {r.date} {r.time}
              </p>
              <p className="text-xs text-gray-500">{r.category}</p>
              <p className="text-sm font-semibold text-gray-900">
                {r.total} {r.currency}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
