import crypto from "crypto";
import { NextRequest } from "next/server";

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

function base64url(input: Buffer | string) {
  const b = (typeof input === "string" ? Buffer.from(input) : input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  return b;
}

function signHS256(payload: Record<string, any>, secret: string) {
  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(payload));
  const data = `${encodedHeader}.${encodedPayload}`;
  const sig = crypto.createHmac("sha256", secret).update(data).digest();
  const encodedSig = base64url(sig);
  return `${data}.${encodedSig}`;
}

async function searchOrionRAG(query: string, token: string): Promise<OrionSearchResult[]> {
  try {
    // Try multiple endpoints for vector search
    const endpoints = [
      `${FABRIC_BASE_URL}/api/vector/search`,
      `${FABRIC_BASE_URL}/search`,
      'http://192.168.50.77:8085/api/vector/search' // Gate API direct
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
      max_tokens: 2048,
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
        maxOutputTokens: 2048,
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
  const iss = process.env.ORION_SHARED_JWT_ISS || "https://www.sidekickportal.com";
  const aud = process.env.ORION_SHARED_JWT_AUD || "orion-core";
  const secret = process.env.ORION_SHARED_JWT_SECRET;
  
  if (!secret) {
    return new Response("server_not_configured", { status: 500 });
  }

  const now = Math.floor(Date.now() / 1000);
  const exp = now + 60 * 5;
  const token = signHS256({ iss, aud, sub, iat: now, exp }, secret);

  // Create a readable stream for SSE
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      
      const sendChunk = (data: string) => {
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      };

      try {
        // Step 1: Search ORION-CORE RAG for relevant context
        sendChunk("🔍 Searching knowledge base...");
        const ragResults = await searchOrionRAG(q, token);
        
        // Step 2: Build context from RAG results
        const context = ragResults.length > 0 
          ? ragResults.map(r => r.content).join('\n\n')
          : '';

        if (context) {
          sendChunk("📚 Found relevant context, enhancing query...");
        }

        // Step 3: Enhance query with Fabric pattern if context available
        const enhancedQuery = context 
          ? await enhanceWithFabricPattern(q, context, token)
          : q;

        // Step 4: Build messages for AI provider
        const messages: ChatMessage[] = [
          {
            role: 'system',
            content: `You are an AI assistant with access to a knowledge base. ${context ? `Here's relevant context from the knowledge base:\n\n${context}\n\nUse this context to provide more accurate and detailed responses.` : 'Provide helpful and accurate responses.'}`
          },
          {
            role: 'user',
            content: enhancedQuery
          }
        ];

        sendChunk(`🤖 Generating response with ${provider}...`);

        // Step 5: Stream response from chosen provider
        if (provider === "gemini" && GEMINI_API_KEY) {
          await streamGeminiResponse(messages, sendChunk);
        } else if (provider === "deepseek" && DEEPSEEK_API_KEY) {
          await streamDeepSeekResponse(messages, sendChunk);
        } else {
          sendChunk("❌ No AI provider configured or available");
          sendChunk("[DONE]");
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
