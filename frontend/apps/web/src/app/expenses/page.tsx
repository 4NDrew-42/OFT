"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { mintJWT, postOCR } from "@/lib/orionClient";

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB

export default function ExpensesPage() {
  const { data: session } = useSession();
  const sub = session?.user?.email ?? "";
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<Array<{ description: string; amount: number; date: string; merchant?: string }>>([]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!file) { setError("no_file"); return; }
    if (file.size > MAX_FILE_BYTES) { setError("file_too_large"); return; }
    if (!sub) { setError("no_sub"); return; }
    try {
      setLoading(true);
      const token = await mintJWT(sub);
      const res = await postOCR(file, token);
      setItems((prev) => [{ description: res.description, amount: res.amount, date: res.date, merchant: res.merchant }, ...prev]);
      setFile(null);
      (document.getElementById("file-input") as HTMLInputElement | null)?.value && ((document.getElementById("file-input") as HTMLInputElement).value = "");
    } catch (err: any) {
      setError(err?.message || "upload_failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="p-4 pb-24 max-w-screen-sm mx-auto">
      <h1 className="text-xl font-semibold mb-3">Expenses</h1>

      <form onSubmit={onSubmit} className="flex items-center gap-2">
        <input id="file-input" type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} className="flex-1 text-sm" />
        <button disabled={!file || !sub || loading} className="rounded bg-blue-600 px-3 py-2 text-sm text-white disabled:opacity-50">{loading ? "Uploading..." : "Upload"}</button>
      </form>

      {error && <p className="mt-2 text-sm text-rose-600">Error: {error}</p>}

      <div className="mt-6 space-y-3">
        {items.map((it, idx) => (
          <div key={idx} className="rounded border p-3 text-sm">
            <div className="flex justify-between"><span className="font-medium">{it.description}</span><span>${"" + it.amount}</span></div>
            <div className="opacity-70">{it.merchant || ""}</div>
            <div className="opacity-70">{it.date}</div>
          </div>
        ))}
        {!items.length && <p className="text-sm opacity-70">No receipts processed yet.</p>}
      </div>
    </main>
  );
}

