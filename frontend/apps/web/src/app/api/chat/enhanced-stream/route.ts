import crypto from "crypto";
import { NextRequest } from "next/server";
import { buildOrionJWT } from "@/lib/auth-token";

export const runtime = "nodejs";

// Environment variables for AI providers
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
// Use the Fabric Bridge URL which includes both vector and fabric services
const FABRIC_BASE_URL = process.env.NEXT_PUBLIC_ORION_API_URL || 'http://localhost:8089';

interface OrionSearchResult {
  id: string;
  content: string;
  metadata?: any;
  score: number;
}

interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}


async function searchOrionRAG(query: string, token: string): Promise<OrionSearchResult[]> {
  try {
    // Try multiple endpoints for vector search
    const endpoints = [
      `${FABRIC_BASE_URL}/api/vector/search`,
      `${FABRIC_BASE_URL}/search`
      // Gate API removed as unnecessary per AGENTS.md
    ];

    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'X-Request-Id': crypto.randomUUID(),
          },
          body: JSON.stringify({
            query,
            top_k: 5,
            threshold: 0.7
          }),
          signal: AbortSignal.timeout(10000) // 10 second timeout
        });

        if (response.ok) {
          const data = await response.json();
          console.log(`✅ ORION RAG search successful via ${endpoint}`);
          return data.results || [];
        }
      } catch (endpointError) {
        console.warn(`❌ ORION RAG search failed for ${endpoint}:`, endpointError);
        continue;
      }
    }

    console.warn('All ORION RAG search endpoints failed');
    return [];
  } catch (error) {
    console.warn('ORION RAG search error:', error);
    return [];
  }
}

async function enhanceWithFabricPattern(query: string, context: string, token: string): Promise<string> {
  // For now, do simple context enhancement since Fabric patterns are not available
  if (!context) return query;

  // Simple enhancement: prepend context information to the query
  return `Based on the following context information, please answer this question:

Context:
${context}

Question: ${query}

Please provide a comprehensive answer using the context information when relevant.`;
}

async function streamDeepSeekResponse(messages: ChatMessage[], onChunk: (chunk: string) => void): Promise<void> {
  if (!DEEPSEEK_API_KEY) {
    throw new Error('DeepSeek API key not configured');
  }

  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages,
      stream: true,
      temperature: 0.7,
      max_tokens: 8000,  // Increased from 2048 to match backend quality
    }),
  });

  if (!response.ok) {
    throw new Error(`DeepSeek API error: ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('No response body');
  }

  const decoder = new TextDecoder();
  
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            onChunk('[DONE]');
            return;
          }

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              onChunk(content);
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

async function streamGeminiResponse(messages: ChatMessage[], onChunk: (chunk: string) => void): Promise<void> {
  if (!GEMINI_API_KEY) {
    throw new Error('Gemini API key not configured');
  }

  // Convert messages to Gemini format
  const contents = messages.map(msg => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }]
  }));

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:streamGenerateContent?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 8000,  // Increased from 2048 to match backend quality
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('No response body');
  }

  const decoder = new TextDecoder();
  
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          
          try {
            const parsed = JSON.parse(data);
            const content = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
            if (content) {
              onChunk(content);
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    }
    onChunk('[DONE]');
  } finally {
    reader.releaseLock();
  }
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const q = url.searchParams.get("q");
  const sub = url.searchParams.get("sub");
  const provider = url.searchParams.get("provider") || "deepseek"; // deepseek or gemini
  
  if (!q || !sub) {
    return new Response("missing q or sub", { status: 400 });
  }

  // Generate JWT for ORION-CORE access
  let token: string;
  try {
    token = buildOrionJWT(sub);
  } catch (e) {
    return new Response("server_not_configured", { status: 500 });
  }

  // Create a readable stream for SSE
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      
      const sendChunk = (data: string) => {
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      };

      try {
        // Step 1: Search ORION-CORE RAG for relevant context
        const ragResults = await searchOrionRAG(q, token);

        // Step 2: Build context from RAG results
        const context = ragResults.length > 0
          ? ragResults.map(r => r.content).join('\n\n')
          : '';

        // Step 3: Use original query to avoid token limit issues
        // TODO: Re-enable RAG enhancement once token limits are resolved
        const enhancedQuery = q;

        // Step 4: Use simplified approach to avoid token limits
        // TODO: Re-enable context injection once token limits are resolved

        // Generate response via ORION backend (no loading message)

        // Step 5: Delegate inference to ORION backend through our proxy (no provider keys needed)
        const origin = url.origin;
        const proxyUrl = new URL('/api/proxy/chat-stream', origin);
        proxyUrl.searchParams.set('q', enhancedQuery);
        proxyUrl.searchParams.set('sub', sub);

        const upstream = await fetch(proxyUrl.toString(), {
          method: 'GET',
          headers: {
            'Accept': 'text/event-stream',
            'X-Request-Id': crypto.randomUUID(),
          },
        });

        if (!upstream.ok || !upstream.body) {
          const text = await upstream.text().catch(() => '');
          let pretty = text;
          try {
            const j = JSON.parse(text);
            // common patterns: { error: "..." } or { message: "..." }
            pretty = j.error || j.message || text;
          } catch {}
          sendChunk(`❌ Upstream error: ${upstream.status}${pretty ? ` - ${pretty.slice(0, 400)}` : ''}`);
          sendChunk('[DONE]');
          return;
        }

        // Pipe upstream SSE directly to client
        const upstreamReader = upstream.body.getReader();
        try {
          while (true) {
            const { done, value } = await upstreamReader.read();
            if (done) break;
            controller.enqueue(value);
          }
        } finally {
          upstreamReader.releaseLock();
        }

      } catch (error) {
        console.error('Enhanced chat stream error:', error);
        sendChunk(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        sendChunk("[DONE]");
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store",
      "Connection": "keep-alive",
    },
  });
}
