"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { mintJWT, eventExtract } from "@/lib/orionClient";

export default function CalendarPage() {
  const { data: session } = useSession();
  const sub = session?.user?.email ?? "";
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<Array<{ title: string; when: string; location?: string; notes?: string }>>([]);

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!text) return;
    if (!sub) { setError("no_sub"); return; }
    try {
      setLoading(true);
      const token = await mintJWT(sub);
      const evt = await eventExtract(text, token);
      setEvents((prev)=>[{ title: evt.title || text.slice(0,40), when: evt.when, location: evt.location, notes: evt.notes }, ...prev]);
      setText("");
    } catch (e: any) {
      setError(e?.message || "add_failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="p-4 pb-24 max-w-screen-sm mx-auto">
      <h1 className="text-xl font-semibold mb-3">Calendar</h1>

      <form onSubmit={onAdd} className="flex gap-2 items-center">
        <input className="flex-1 rounded border px-3 py-2 text-sm" placeholder="e.g., Lunch with Sam tomorrow 12pm at Cafe Rio" value={text} onChange={(e)=>setText(e.target.value)} />
        <button disabled={!sub || !text || loading} className="rounded bg-blue-600 px-3 py-2 text-sm text-white disabled:opacity-50">{loading?"Adding...":"Quick add"}</button>
      </form>

      {error && <p className="mt-2 text-sm text-rose-600">Error: {error}</p>}

      <div className="mt-6 space-y-3">
        {events.map((ev, idx)=> (
          <div key={idx} className="rounded border p-3 text-sm">
            <div className="font-medium">{ev.title}</div>
            <div className="opacity-80">{new Date(ev.when).toLocaleString()}</div>
            {ev.location && <div className="opacity-70">{ev.location}</div>}
            {ev.notes && <div className="opacity-70 whitespace-pre-wrap">{ev.notes}</div>}
          </div>
        ))}
        {!events.length && <p className="text-sm opacity-70">No events yet.</p>}
      </div>
    </main>
  );
}

