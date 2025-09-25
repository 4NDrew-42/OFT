import { useEffect, useRef, useState } from "react";
import { getChatProxyUrl } from "@/lib/orionClient";

const MAX_PROMPT_LENGTH = 8192; // bytes limit (approx chars)

export function useChatStream(sub: string) {
  const esRef = useRef<EventSource | null>(null);
  const [buffer, setBuffer] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function stop() {
    esRef.current?.close();
    esRef.current = null;
    setIsStreaming(false);
  }

  async function start(q: string) {
    const encodedLen = encodeURIComponent(q).length;
    if (encodedLen > MAX_PROMPT_LENGTH) {
      setError("prompt_too_long");
      return;
    }

    stop();
    setBuffer("");
    setError(null);
    setIsStreaming(true);

    const url = getChatProxyUrl(q, sub);
    const es = new EventSource(url, { withCredentials: false });
    es.onmessage = (e) => {
      if (e.data === "[DONE]") {
        stop();
        return;
      }
      setBuffer((prev) => prev + e.data);
    };
    es.onerror = () => {
      setError("stream_error");
      stop();
    };
    esRef.current = es;
  }

  useEffect(() => () => stop(), []);

  return { buffer, isStreaming, error, start, stop } as const;
}

