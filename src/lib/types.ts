export interface ExtractedReceipt {
  merchant: string | null;
  date: string | null;
  time: string | null;
  category: string | null;
  total: number | null;
  currency: string | null;
  tax: number | null;
  bankName: string | null;
  items: string[];
}

export interface ReceiptDraft {
  id: string;
  fileName: string;
  imageBase64: string;
  status: "pending" | "analyzing" | "analyzed" | "error";
  error?: string;
  merchant: string;
  date: string;
  time: string;
  category: string;
  total: string;
  currency: string;
  tax: string;
  bankName: string;
  items: string;
}

export interface SheetReceiptPayload {
  merchant: string;
  date: string;
  time: string;
  category: string;
  total: number | null;
  currency: string;
  tax: number | null;
  bankName: string;
  items: string[];
  imageBase64: string;
  fileName: string;
}

export interface HistoryReceipt {
  merchant: string;
  date: string;
  time: string;
  category: string;
  total: string;
  currency: string;
  tax: string;
  bankName: string;
  items: string;
  imageUrl: string;
  uploadedAt: string;
}
