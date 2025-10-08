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
  if (wordCount < 10 && !hasDetailKeywords && historyLength === 0) return 500;
  
  // Follow-up questions in conversation
  if (historyLength > 0 && wordCount < 15) return 1000;
  
  // Medium complexity questions
  if (wordCount < 20 && !hasDetailKeywords) return 2000;
  
  // Detailed explanations requested
  if (hasDetailKeywords) return 10000;
  
  // Temporal queries (need to search history)
  if (hasTemporalKeywords) return 5000;
  
  // Default for complex queries
  return 5000;
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

  // Use production Cloudflare tunnel endpoint for ORION-CORE Enhanced Chat
  const ENHANCED_CHAT_URL = 'https://orion-chat.sidekickportal.com/api/chat-enhanced';

  const upstream = await fetch(ENHANCED_CHAT_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "X-Request-Id": reqId,
    },
    body: JSON.stringify({ 
      message: q,
      sessionId: `web_${sub}_${Date.now()}`,
      userId: sub,
      useRAG: true,
      model: 'deepseek-chat',
      conversationHistory: conversationHistory,
      maxTokens: estimateRequiredTokens(q, conversationHistory)
    }),
  });

  if (!upstream.ok) {
    const text = await upstream.text();
    return new Response(text || "enhanced_chat_error", { status: upstream.status });
  }

  const jsonResponse = await upstream.json();
  const responseContent = jsonResponse.response || "No response generated";

  // Convert to SSE format for frontend compatibility
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      // Send the response as SSE data
      controller.enqueue(encoder.encode(`data: ${responseContent}\n\n`));
      controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
      controller.close();
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store",
      Connection: "keep-alive",
    },
  });
}
