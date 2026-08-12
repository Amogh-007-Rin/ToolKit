import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import prisma from "@/db";
import { getSessionUserId } from "@/lib/session";

const MODEL = "gemini-3.1-flash-lite";
const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_MAX = 50;
// Google web search grounding is a paid, quota-gated feature that is not
// available on all API keys (the ungrounded fallback silently costs a full
// failed request + latency on every call). Opt in explicitly with:
// GEMINI_WEB_SEARCH=true
const GROUNDING_ENABLED = process.env.GEMINI_WEB_SEARCH === "true";
const RATE_LIMIT_MESSAGE =
  "AI search is rate-limited right now. Please wait a minute and try again.";

interface AIResult {
  name: string;
  link: string;
  description: string;
  reason: string;
}

const cache = new Map<string, { at: number; results: AIResult[] }>();

function sanitizeLink(raw: string): string | null {
  try {
    let url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (url.hostname === "google.com" || url.hostname.endsWith(".google.com")) {
      const target = url.searchParams.get("q");
      if (!target) return null;
      url = new URL(target);
      if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

function isRateLimited(error: unknown): boolean {
  if (error instanceof Error) {
    if (error.message.includes("RESOURCE_EXHAUSTED")) return true;
    if (error.message.includes('"code":429')) return true;
    if (/429/.test(error.message)) return true;
  }
  const anyError = error as { statusCode?: number };
  return anyError.statusCode === 429;
}

function promptFor(query: string) {
  return `You are an expert tool finder. A developer needs a tool for this use case:
"${query}"

Find real, well-known tools available on the internet (NOT tools from any local collection). Recommend at most 8 tools that fit the use case.

For each tool return:
- "name": the official product name
- "link": the official website URL (e.g. https://example.com)
- "description": one sentence on what the tool does
- "reason": short reason why it fits the use case (max 15 words)

Only recommend real tools with real official URLs.
Respond with ONLY valid JSON (no markdown, no code fences) in this exact shape:
{"results":[{"name":"...","link":"https://...","description":"...","reason":"..."}]}
If nothing fits the request, respond with {"results":[]}.`;
}

function parseResults(text: string): AIResult[] {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return [];
  const parsed = JSON.parse(jsonMatch[0]) as { results?: AIResult[] };
  return (parsed.results ?? [])
    .filter((r) => r.name && sanitizeLink(r.link))
    .slice(0, 8)
    .map((r) => ({
      name: r.name.trim(),
      link: sanitizeLink(r.link)!,
      description: (r.description ?? "").trim(),
      reason: (r.reason ?? "").trim(),
    }));
}

export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY is not configured. Add it to your .env file." },
      { status: 500 }
    );
  }

  let body: { query?: string; chatId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const query = (body.query ?? "").trim();
  if (!query) {
    return NextResponse.json({ error: "Query is required" }, { status: 400 });
  }
  if (query.length > 200) {
    return NextResponse.json({ error: "Query is too long" }, { status: 400 });
  }

  const chatId = body.chatId?.trim() || null;
  if (chatId) {
    const chat = await prisma.aIChat.findFirst({
      where: { id: chatId, userId },
      select: { id: true },
    });
    if (!chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }
  }

  const persistTurn = async (results: AIResult[] | null, error: string | null) => {
    if (!chatId) return;
    await prisma.$transaction([
      prisma.aIChatMessage.create({
        data: { chatId, role: "user", content: query },
      }),
      prisma.aIChatMessage.create({
        data: {
          chatId,
          role: "assistant",
          content: "",
          results: results ? (results as unknown as object) : undefined,
          error,
        },
      }),
      prisma.aIChat.update({
        where: { id: chatId },
        data: { updatedAt: new Date() },
      }),
    ]);
  };

  const cached = cache.get(query);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
    await persistTurn(cached.results, null);
    return NextResponse.json({ results: cached.results });
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const prompt = promptFor(query);

  const call = async (grounded: boolean) =>
    ai.models.generateContent({
      model: MODEL,
      contents: prompt,
      config: {
        ...(grounded ? { tools: [{ googleSearch: {} }] } : {}),
        temperature: 0.3,
        maxOutputTokens: 2000,
      },
    });

  let response;
  if (!GROUNDING_ENABLED) {
    try {
      response = await call(false);
    } catch (error) {
      const fallbackMessage =
        error instanceof Error ? error.message : "AI search failed";
      const message = isRateLimited(error) ? RATE_LIMIT_MESSAGE : fallbackMessage;
      await persistTurn(null, message);
      return NextResponse.json({ error: message }, { status: 502 });
    }
  } else {
    try {
      response = await call(true);
    } catch (error) {
      if (!isRateLimited(error)) {
        const message = error instanceof Error ? error.message : "AI search failed";
        await persistTurn(null, message);
        return NextResponse.json({ error: message }, { status: 502 });
      }
      try {
        response = await call(false);
      } catch (fallbackError) {
        const fallbackMessage =
          fallbackError instanceof Error ? fallbackError.message : "AI search failed";
        const message = isRateLimited(fallbackError)
          ? RATE_LIMIT_MESSAGE
          : fallbackMessage;
        await persistTurn(null, message);
        return NextResponse.json({ error: message }, { status: 502 });
      }
    }
  }

  let results: AIResult[];
  try {
    results = parseResults(response.text ?? "");
  } catch {
    const message = "AI returned an unparseable response";
    await persistTurn(null, message);
    return NextResponse.json({ error: message }, { status: 502 });
  }

  if (cache.size >= CACHE_MAX) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  cache.set(query, { at: Date.now(), results });

  await persistTurn(results, null);

  return NextResponse.json({ results });
}
