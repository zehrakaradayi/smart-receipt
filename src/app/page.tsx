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
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-4 py-10 sm:px-6">
      <header>
        <h1 className="text-2xl font-bold text-gray-900">Smart Receipt</h1>
        <p className="text-sm text-gray-500">Fişlerini tara, düzenle ve Google Sheets&apos;e gönder.</p>
      </header>

      {banner && (
        <div
          className={`rounded-lg px-4 py-3 text-sm ${
            banner.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
          }`}
        >
          {banner.message}
        </div>
      )}

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-gray-900">Upload Receipts</h2>
        <UploadArea onFilesAdded={addFiles} disabled={isAnalyzing || isSending} />
      </section>

      {drafts.length > 0 && (
        <section className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-semibold text-gray-900">Results ({drafts.length})</h2>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleAnalyze}
                disabled={isAnalyzing || isSending}
                className="rounded-lg bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
              >
                {isAnalyzing ? "Analyzing…" : "Analyze Receipts"}
              </button>
              <button
                type="button"
                onClick={handleSend}
                disabled={isAnalyzing || isSending}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
              >
                {isSending ? "Sending…" : "Send to Google Sheets"}
              </button>
            </div>
          </div>

          <ReceiptsTable drafts={drafts} onChange={updateDraft} onRemove={removeDraft} />

          <p className="text-sm text-gray-500">Total Amount: {totalAmount.toFixed(2)}</p>
        </section>
      )}

      <HistorySection key={historyRefreshKey} />
    </div>
  );
}
