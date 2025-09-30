import { useEffect, useRef, useState } from "react";

const MAX_PROMPT_LENGTH = 8192; // bytes limit (approx chars)

export type ChatProvider = 'deepseek' | 'gemini';

export interface EnhancedChatOptions {
  provider?: ChatProvider;
  enableRAG?: boolean;
}

export function useEnhancedChatStream(sub: string, options: EnhancedChatOptions = {}) {
  const esRef = useRef<EventSource | null>(null);
  const [buffer, setBuffer] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ragContext, setRagContext] = useState<string[]>([]);
  const [currentProvider, setCurrentProvider] = useState<ChatProvider>(options.provider || 'deepseek');

  function stop() {
    esRef.current?.close();
    esRef.current = null;
    setIsStreaming(false);
  }

  function getEnhancedChatUrl(query: string, sub: string, provider: ChatProvider): string {
    const params = new URLSearchParams({
      q: query,
      sub: sub
    });
    // Bypass enhanced-stream and use proxy directly to avoid truncation issues
    return `/api/proxy/chat-stream?${params.toString()}`;
  }

  async function start(q: string, customOptions?: EnhancedChatOptions) {
    const encodedLen = encodeURIComponent(q).length;
    if (encodedLen > MAX_PROMPT_LENGTH) {
      setError("prompt_too_long");
      return;
    }

    stop();
    setBuffer("");
    setError(null);
    setRagContext([]);
    setIsStreaming(true);

    const provider = customOptions?.provider || currentProvider;
    const url = getEnhancedChatUrl(q, sub, provider);
    
    const es = new EventSource(url, { withCredentials: false });
    
    es.onmessage = (e) => {
      if (e.data === "[DONE]") {
        stop();
        return;
      }

      // Filter out loading/status messages - don't add them to buffer
      if (e.data.startsWith("🔍") || e.data.startsWith("📚") || e.data.startsWith("🤖")) {
        // These are loading messages, ignore them for cleaner UX
        return;
      }

      // Handle error messages
      if (e.data.startsWith("❌")) {
        setError(e.data);
        setBuffer((prev) => prev + e.data + "\n");
        return;
      }

      // Regular content
      setBuffer((prev) => prev + e.data);
    };

    es.onerror = (event) => {
      console.error('EventSource error:', event);
      setError("stream_error");
      stop();
    };

    esRef.current = es;
  }

  function switchProvider(provider: ChatProvider) {
    setCurrentProvider(provider);
    if (isStreaming) {
      stop();
    }
  }

  function clearBuffer() {
    setBuffer("");
    setError(null);
    setRagContext([]);
  }

  useEffect(() => () => stop(), []);

  return { 
    buffer, 
    isStreaming, 
    error, 
    ragContext,
    currentProvider,
    start, 
    stop, 
    switchProvider,
    clearBuffer,
    availableProviders: ['deepseek', 'gemini'] as ChatProvider[]
  } as const;
}
