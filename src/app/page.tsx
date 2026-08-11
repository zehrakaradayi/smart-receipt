"use client";

import { useState } from "react";
import UploadArea from "@/components/UploadArea";
import ReceiptsTable from "@/components/ReceiptsTable";
import HistorySection from "@/components/HistorySection";
import type { ReceiptDraft, SheetReceiptPayload } from "@/lib/types";

type Banner = { type: "success" | "error"; message: string } | null;

export default function Home() {
  const [drafts, setDrafts] = useState<ReceiptDraft[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [banner, setBanner] = useState<Banner>(null);
  const [historyRefreshKey, setHistoryRefreshKey] = useState(0);

  function addFiles(files: { id: string; fileName: string; imageBase64: string }[]) {
    setBanner(null);
    setDrafts((prev) => [
      ...prev,
      ...files.map(
        (f): ReceiptDraft => ({
          id: f.id,
          fileName: f.fileName,
          imageBase64: f.imageBase64,
          status: "pending",
          merchant: "",
          date: "",
          time: "",
          category: "",
          total: "",
          currency: "",
          tax: "",
          bankName: "",
          items: "",
        })
      ),
    ]);
  }

  function updateDraft(id: string, field: keyof ReceiptDraft, value: string) {
    setDrafts((prev) => prev.map((d) => (d.id === id ? { ...d, [field]: value } : d)));
  }

  function removeDraft(id: string) {
    setDrafts((prev) => prev.filter((d) => d.id !== id));
  }

  async function handleAnalyze() {
    const toAnalyze = drafts.filter((d) => d.status === "pending" || d.status === "error");
    if (toAnalyze.length === 0) return;

    setBanner(null);
    setIsAnalyzing(true);
    setDrafts((prev) =>
      prev.map((d) => (toAnalyze.some((t) => t.id === d.id) ? { ...d, status: "analyzing", error: undefined } : d))
    );

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          images: toAnalyze.map((d) => ({ id: d.id, imageBase64: d.imageBase64 })),
        }),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error || "Analiz başarısız oldu.");

      setDrafts((prev) =>
        prev.map((d) => {
          const result = data.results.find((r: { id: string }) => r.id === d.id);
          if (!result) return d;
          if (!result.success) {
            return { ...d, status: "error", error: result.error };
          }
          const r = result.data;
          return {
            ...d,
            status: "analyzed",
            merchant: r.merchant ?? "",
            date: r.date ?? "",
            time: r.time ?? "",
            category: r.category ?? "",
            total: r.total != null ? String(r.total) : "",
            currency: r.currency ?? "",
            tax: r.tax != null ? String(r.tax) : "",
            bankName: r.bankName ?? "",
            items: Array.isArray(r.items) ? r.items.join(", ") : "",
          };
        })
      );
    } catch (err) {
      setBanner({ type: "error", message: err instanceof Error ? err.message : "Analiz başarısız oldu." });
      setDrafts((prev) =>
        prev.map((d) => (toAnalyze.some((t) => t.id === d.id) && d.status === "analyzing" ? { ...d, status: "error" } : d))
      );
    } finally {
      setIsAnalyzing(false);
    }
  }

  async function handleSend() {
    if (drafts.length === 0) return;
    setBanner(null);
    setIsSending(true);

    try {
      const receipts: SheetReceiptPayload[] = drafts.map((d) => ({
        merchant: d.merchant,
        date: d.date,
        time: d.time,
        category: d.category,
        total: d.total.trim() === "" ? null : Number(d.total),
        currency: d.currency,
        tax: d.tax.trim() === "" ? null : Number(d.tax),
        bankName: d.bankName,
        items: d.items
          .split(",")
          .map((i) => i.trim())
          .filter(Boolean),
        imageBase64: d.imageBase64,
        fileName: d.fileName,
      }));

      const response = await fetch("/api/send-to-sheets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receipts }),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error || "Google Sheets'e gönderilemedi.");

      setBanner({ type: "success", message: `${receipts.length} fiş başarıyla Google Sheets'e gönderildi.` });
      setDrafts([]);
      setHistoryRefreshKey((k) => k + 1);
    } catch (err) {
      setBanner({
        type: "error",
        message: err instanceof Error ? err.message : "Google Sheets'e gönderilemedi.",
      });
    } finally {
      setIsSending(false);
    }
  }

  const totalAmount = drafts.reduce((sum, d) => sum + (Number(d.total) || 0), 0);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-4 py-10 sm:px-6 sm:py-14">
      <header className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground shadow-[0_2px_6px_rgba(196,68,26,0.35)]">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path
              d="M6 2.5h12a.5.5 0 0 1 .5.5v18.13a.5.5 0 0 1-.74.44l-1.8-1a.5.5 0 0 0-.5 0l-1.71.96a.5.5 0 0 1-.5 0l-1.71-.96a.5.5 0 0 0-.48 0l-1.71.96a.5.5 0 0 1-.5 0l-1.71-.96a.5.5 0 0 0-.5 0l-1.8 1a.5.5 0 0 1-.74-.44V3a.5.5 0 0 1 .5-.5Z"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <path d="M8.25 8h7.5M8.25 11.25h7.5M8.25 14.5h4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">Smart Receipt</h1>
          <p className="text-sm text-ink-muted">Fişlerini tara, düzenle ve Google Sheets&apos;e gönder.</p>
        </div>
      </header>

      {banner && (
        <div
          role="status"
          className={`flex items-start gap-3 rounded-xl px-4 py-3 text-sm font-medium ${
            banner.type === "success" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-800"
          }`}
        >
          {banner.type === "success" ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="mt-0.5 shrink-0" aria-hidden="true">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
              <path d="m8.5 12.5 2.4 2.4L15.5 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="mt-0.5 shrink-0" aria-hidden="true">
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
              <path d="M12 8v5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="12" cy="16" r="0.9" fill="currentColor" />
            </svg>
          )}
          <span>{banner.message}</span>
        </div>
      )}

      <section className="flex flex-col gap-4">
        <h2 className="text-base font-semibold text-ink">Fiş Yükle</h2>
        <UploadArea onFilesAdded={addFiles} disabled={isAnalyzing || isSending} />
      </section>

      {drafts.length > 0 && (
        <section className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-base font-semibold text-ink">
              Sonuçlar <span className="text-ink-muted">({drafts.length})</span>
            </h2>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={isAnalyzing || isSending}
                className="rounded-lg border border-hairline-strong bg-surface px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface-alt disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isAnalyzing ? "Analiz ediliyor…" : "Analyze Receipts"}
              </button>
              <button
                type="button"
                onClick={handleSend}
                disabled={isAnalyzing || isSending}
                className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-foreground shadow-sm transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSending ? "Gönderiliyor…" : "Send to Google Sheets"}
              </button>
            </div>
          </div>

          <ReceiptsTable drafts={drafts} onChange={updateDraft} onRemove={removeDraft} />

          <div className="flex items-center justify-between rounded-xl bg-surface-alt px-4 py-3">
            <span className="text-sm font-medium text-ink-muted">Total Amount</span>
            <span className="font-mono text-lg font-semibold text-ink">{totalAmount.toFixed(2)}</span>
          </div>
        </section>
      )}

      <HistorySection key={historyRefreshKey} />
    </div>
  );
}
