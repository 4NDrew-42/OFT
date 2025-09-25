"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { mintJWT, searchNotes } from "@/lib/orionClient";

export default function NotesPage() {
  const { data: session } = useSession();
  const sub = session?.user?.email ?? "";
  const [q, setQ] = useState("");
  const [semantic, setSemantic] = useState(true);
  const [k, setK] = useState(8);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<Array<{ id?: string; title?: string; snippet?: string }>>([]);

  async function onSearch() {
    setError(null);
    if (!q) return;
    if (!sub) { setError("no_sub"); return; }
    if (encodeURIComponent(q).length > 2000) { setError("query_too_long"); return; }
    try {
      setLoading(true);
      const token = await mintJWT(sub);
      const res = await searchNotes(q, k, semantic, token);
      setItems(res.items || []);
    } catch (e: any) {
      setError(e?.message || "search_failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="p-4 pb-24 max-w-screen-sm mx-auto">
      <h1 className="text-xl font-semibold mb-3">Notes</h1>

      <div className="flex gap-2 items-center mb-2">
        <input className="flex-1 rounded border px-3 py-2 text-sm" placeholder="Search notes..." value={q} onChange={(e)=>setQ(e.target.value)} />
      </div>
      <div className="flex items-center gap-3 mb-2 text-sm">
        <label className="flex items-center gap-2"><input type="checkbox" checked={semantic} onChange={(e)=>setSemantic(e.target.checked)} /> Semantic</label>
        <label className="flex items-center gap-2">TopK
          <input type="range" min={1} max={25} value={k} onChange={(e)=>setK(parseInt(e.target.value))} />
          <span className="w-6 text-right">{k}</span>
        </label>
        <button onClick={onSearch} disabled={!sub || loading || !q} className="rounded bg-blue-600 px-3 py-2 text-white disabled:opacity-50">{loading?"Searching...":"Search"}</button>
      </div>

      {error && <p className="text-sm text-rose-600">Error: {error}</p>}

      <div className="mt-4 space-y-3">
        {items.map((it, idx) => (
          <div key={it.id||idx} className="rounded border p-3 text-sm">
            <div className="font-medium">{it.title || `Result ${idx+1}`}</div>
            <div className="opacity-80 whitespace-pre-wrap">{it.snippet || ""}</div>
          </div>
        ))}
        {!items.length && <p className="text-sm opacity-70">No results.</p>}
      </div>
    </main>
  );
}

