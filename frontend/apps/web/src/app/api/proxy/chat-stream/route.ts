import crypto from "crypto";
import { CHAT_STREAM_URL } from "@/lib/env";
import { buildOrionJWT } from "@/lib/auth-token";

export const runtime = "nodejs";

// Estimate required tokens based on query complexity
function estimateRequiredTokens(query: string, history: Array<{ role: string; content: string }>): number {
  const wordCount = query.split(/\s+/).length;
  const hasDetailKeywords = /detailed|comprehensive|explain|analyze|compare|describe in depth|tell me about|what is|how does/i.test(query);
  const hasTemporalKeywords = /yesterday|last week|recently|today|this morning/i.test(query);
  const historyLength = history.length;
  
  // Simple factual questions with no history
  if (wordCount < 10 && !hasDetailKeywords && historyLength === 0) return 4000;  // Increased from 500
  
  // Follow-up questions in conversation
  if (historyLength > 0 && wordCount < 15) return 6000;  // Increased from 1000
  
  // Medium complexity questions
  if (wordCount < 20 && !hasDetailKeywords) return 8000;  // Increased from 2000
  
  // Detailed explanations requested
  if (hasDetailKeywords) return 16000;  // Increased from 10000
  
  // Temporal queries (need to search history)
  if (hasTemporalKeywords) return 12000;  // Increased from 5000
  
  // Default for complex queries
  return 10000;  // Increased from 5000
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q");
  const sub = url.searchParams.get("sub");
  const historyParam = url.searchParams.get("history");
  
  if (!q || !sub) {
    return new Response("missing q or sub", { status: 400 });
  }
  
  // Parse conversation history if provided
  let conversationHistory: Array<{ role: string; content: string }> = [];
  if (historyParam) {
    try {
      conversationHistory = JSON.parse(historyParam);
    } catch (e) {
      console.error('Failed to parse conversation history:', e);
    }
  }

  let token: string;
  try {
    token = buildOrionJWT(sub);
  } catch (e) {
    return new Response("server_not_configured", { status: 500 });
  }

  const reqId = req.headers.get("x-request-id") || (globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2));

  // Use production Cloudflare tunnel endpoint for ORION-CORE SSE Streaming
  const SSE_STREAM_URL = 'https://orion-chat.sidekickportal.com/api/chat-stream';

  // Build query parameters for SSE endpoint
  const params = new URLSearchParams({
    message: q,
    userId: sub,
    sessionId: `web_${sub}_${Date.now()}`,
    useRAG: 'true',
    model: 'deepseek-chat',
    maxTokens: estimateRequiredTokens(q, conversationHistory).toString()
  });

  // Add conversation history if provided
  if (conversationHistory.length > 0) {
    params.append('conversationHistory', JSON.stringify(conversationHistory));
  }

  const upstream = await fetch(`${SSE_STREAM_URL}?${params.toString()}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "X-Request-Id": reqId,
      "Accept": "text/event-stream",
    },
  });

  if (!upstream.ok) {
    const text = await upstream.text();
    return new Response(text || "stream_error", { status: upstream.status });
  }

  // Directly proxy the SSE stream from backend
  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-store, must-revalidate",
      "Connection": "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
