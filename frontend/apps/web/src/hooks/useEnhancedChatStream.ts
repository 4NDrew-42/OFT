import { useEffect, useRef, useState } from "react";

const MAX_PROMPT_LENGTH = 8192; // bytes limit (approx chars)

export type ChatProvider = 'deepseek' | 'gemini';

export interface EnhancedChatOptions {
  provider?: ChatProvider;
  enableRAG?: boolean;
  conversationHistory?: Array<{ role: string; content: string }>;
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

  function getEnhancedChatUrl(query: string, sub: string, provider: ChatProvider, history?: Array<{ role: string; content: string }>): string {
    const params = new URLSearchParams({
      q: query,
      sub: sub
    });
    
    // Add conversation history if provided
    if (history && history.length > 0) {
      params.set('history', JSON.stringify(history));
    }
    
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
    const conversationHistory = customOptions?.conversationHistory || [];
    const url = getEnhancedChatUrl(q, sub, provider, conversationHistory);
    
    const es = new EventSource(url, { withCredentials: false });
    
    es.onmessage = (e) => {
      if (e.data === "[DONE]") {
        stop();
        return;
      }

      // Try to parse as JSON first (backend sends JSON events)
      try {
        const parsed = JSON.parse(e.data);

        // Handle different event types from backend
        if (parsed.type === 'status' || parsed.type === 'loading') {
          // Ignore status messages for cleaner UX
          return;
        } else if (parsed.type === 'error') {
          // Handle backend errors gracefully
          const errorMsg = parsed.message || 'Unknown error';
          setError(errorMsg);

          // Provide helpful fallback message for specific errors
          if (errorMsg.includes('Could not detect node name')) {
            setBuffer((prev) => prev + `⚠️ Backend is processing your query but encountered a routing issue. Please try again or rephrase your question.\n`);
          } else {
            setBuffer((prev) => prev + `❌ ${errorMsg}\n`);
          }
          return;
        } else if (parsed.type === 'content' && parsed.text) {
          // Content event - add to buffer
          setBuffer((prev) => prev + parsed.text);
          return;
        } else if (parsed.type === 'done') {
          // Stream complete
          stop();
          return;
        }
      } catch {
        // Not JSON, treat as plain text
      }

      // Filter out emoji-prefixed status messages (plain text format)
      const statusEmojis = ["🔍", "📚", "🤖", "💭", "🧠", "✓", "⚡", "📊"];
      if (statusEmojis.some(emoji => e.data.startsWith(emoji))) {
        // These are status messages from backend, ignore for cleaner UX
        return;
      }

      // Handle error messages
      if (e.data.startsWith("❌")) {
        setError(e.data);
        setBuffer((prev) => prev + e.data + "\n");
        return;
      }

      // Regular content - only add actual response text
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
