"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useChatStream } from "@/hooks/useChatStream";

export default function AssistantPage() {
  const { data: session } = useSession();
  const sub = session?.user?.email ?? "";
  const { buffer, isStreaming, error, start, stop } = useChatStream(sub);
  const [q, setQ] = useState("");

  return (
    <main className="p-4 pb-28 max-w-screen-sm mx-auto">
      <h1 className="text-xl font-semibold mb-3">Assistant</h1>
      <div className="flex gap-2">
        <input
          className="flex-1 rounded border px-3 py-2 text-sm"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Ask something..."
        />
        <button
          className="rounded bg-blue-600 px-3 py-2 text-sm text-white disabled:opacity-50"
          onClick={() => start(q)}
          disabled={!sub || !q || isStreaming}
        >Send</button>
        <button
          className="rounded border px-3 py-2 text-sm"
          onClick={stop}
          disabled={!isStreaming}
        >Stop</button>
      </div>

      {error && <p className="mt-2 text-sm text-rose-600">Error: {error}</p>}

      <pre className="mt-4 whitespace-pre-wrap rounded border bg-muted/30 p-3 text-sm min-h-[120px]">{buffer || ""}</pre>
    </main>
  );
}

