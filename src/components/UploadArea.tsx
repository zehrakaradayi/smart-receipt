"use client";

import { useRef, useState } from "react";

interface UploadAreaProps {
  onFilesAdded: (files: { id: string; fileName: string; imageBase64: string }[]) => void;
  disabled?: boolean;
}

function fileToDataUri(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function UploadArea({ onFilesAdded, disabled }: UploadAreaProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dropWarning, setDropWarning] = useState<string | null>(null);

  async function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) {
      setDropWarning("Bu öğe bir dosya değil gibi görünüyor. Bir web sayfasından görsel sürüklüyorsan, önce bilgisayarına kaydedip öyle yükle.");
      return;
    }
    const files = Array.from(fileList).filter((f) => f.type.startsWith("image/"));
    if (files.length === 0) {
      setDropWarning("Yalnızca görsel dosyaları (JPG, PNG vb.) yükleyebilirsin.");
      return;
    }
    setDropWarning(null);
    const entries = await Promise.all(
      files.map(async (file) => ({
        id: crypto.randomUUID(),
        fileName: file.name,
        imageBase64: await fileToDataUri(file),
      }))
    );
    onFilesAdded(entries);
  }

  return (
    <div>
      <div
        className={`flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
          isDragging ? "border-accent bg-accent-soft" : "border-hairline-strong bg-surface-alt"
        } ${disabled ? "pointer-events-none opacity-50" : "cursor-pointer"}`}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
      >
        <svg
          className={`h-9 w-9 ${isDragging ? "text-accent" : "text-ink-faint"}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z" />
        </svg>
        <p className="text-sm text-ink">
          <span className="font-semibold text-accent">Fiş görseli seç</span> ya da buraya sürükle
        </p>
        <p className="text-xs text-ink-muted">Aynı anda birden fazla fotoğraf seçebilirsin</p>
      </div>

      {dropWarning && (
        <p className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-800">{dropWarning}</p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => fileInputRef.current?.click()}
          className="rounded-lg border border-hairline-strong bg-surface px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface-alt disabled:cursor-not-allowed disabled:opacity-50"
        >
          Upload Photos
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => cameraInputRef.current?.click()}
          className="rounded-lg border border-hairline-strong bg-surface px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface-alt disabled:cursor-not-allowed disabled:opacity-50"
        >
          Take Photo
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
