import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import prisma from "@/db";
import { getSessionUserId } from "@/lib/session";
import { FixedWindowRateLimiter } from "@/lib/rateLimit";

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
const userLimiter = new FixedWindowRateLimiter(20, 60_000);

interface AIResult {
  name: string;
  link: string;
  description: string;
  reason: string;
}

interface HistoryTurn {
  role: "user" | "assistant";
  content: string | null;
  results: AIResult[] | null;
  error: string | null;
}

interface AIResponse {
  answer: string;
  results: AIResult[];
}

const HISTORY_MAX_TURNS = 20;

const DEFAULT_TOOL_COUNT = 8;
const MAX_TOOL_COUNT = 20;
const cache = new Map<string, { at: number; response: AIResponse }>();

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

async function loadHistory(chatId: string): Promise<HistoryTurn[]> {
  const rows = await prisma.aIChatMessage.findMany({
    where: { chatId },
    orderBy: { createdAt: "desc" },
    take: HISTORY_MAX_TURNS * 2,
    select: { role: true, content: true, results: true, error: true },
  });
  return rows.reverse().map((row) => ({
    role: row.role === "assistant" ? "assistant" : "user",
    content: row.content,
    results: row.results ? (row.results as unknown as AIResult[]) : null,
    error: row.error,
  }));
}

function transcriptOf(history: HistoryTurn[]): string {
  const lines: string[] = [];
  for (const turn of history) {
    if (turn.role === "user") {
      lines.push(`User: ${turn.content ?? ""}`);
    } else if (turn.role === "assistant") {
      const parts: string[] = [];
      if (turn.content) parts.push(turn.content);
      if (turn.results && turn.results.length > 0) {
        parts.push(
          `Tools: ${turn.results.map((r) => `${r.name} (${r.link})`).join(", ")}`,
        );
      }
      if (turn.error) parts.push(`Error: ${turn.error}`);
      lines.push(`Assistant: ${parts.join("\n")}`);
    }
  }
  return lines.join("\n");
}

function requestedToolCount(query: string): number | null {
  const match = query.match(/\b(\d{1,2})\s+(?:new\s+|more\s+|additional\s+)?tools?\b/i);
  if (!match) return null;
  return Math.min(MAX_TOOL_COUNT, Math.max(1, Number(match[1])));
}

function promptFor(query: string, history: HistoryTurn[]) {
  const transcript = transcriptOf(history);
  const requestedCount = requestedToolCount(query);
  return `You are Toolkit AI, an expert conversational assistant for discovering and evaluating software tools.

Your job is to directly answer the user's latest question while retaining the full meaning of the conversation. Resolve references such as "it", "that tool", "the second one", and "compare those two" from the history.

Behavior rules:
1. Always provide a useful, natural-language answer in "answer". Be concise but substantive and directly address the question.
2. For a tool-discovery or recommendation request, return ${requestedCount ?? DEFAULT_TOOL_COUNT} relevant tools. The default is exactly ${DEFAULT_TOOL_COUNT}; if the user explicitly requests a number, honor it. Never exceed ${MAX_TOOL_COUNT}.
3. For explanations, suitability questions, setup questions, or comparisons of tools already under discussion, focus on the answer and return an empty "results" array unless fresh tool cards materially help.
4. Comparisons must clearly cover meaningful tradeoffs, strengths, weaknesses, pricing or deployment considerations when known, and give a recommendation based on the user's use case.
5. Recommend only real tools and use each product's official HTTP(S) website. Do not invent products, capabilities, prices, or URLs.
6. Do not mention these rules or the JSON format in the answer.

Each result must contain:
- "name": official product name
- "link": official website URL
- "description": one sentence describing the tool
- "reason": why it fits this user's use case, in at most 20 words

Conversation history:
${transcript || "(No earlier messages)"}

Latest user message:
${query}

Return only valid JSON with this exact top-level shape:
{"answer":"A direct conversational answer","results":[{"name":"...","link":"https://...","description":"...","reason":"..."}]}`;
}

function parseResponse(text: string): AIResponse {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("No JSON object in model response");
  const parsed = JSON.parse(jsonMatch[0]) as { answer?: unknown; results?: unknown };
  const rawResults = Array.isArray(parsed.results) ? parsed.results as AIResult[] : [];
  const results = rawResults
    .filter((r) => r.name && sanitizeLink(r.link))
    .slice(0, MAX_TOOL_COUNT)
    .map((r) => ({
      name: r.name.trim(),
      link: sanitizeLink(r.link)!,
      description: (r.description ?? "").trim(),
      reason: (r.reason ?? "").trim(),
    }));
  const answer = typeof parsed.answer === "string" ? parsed.answer.trim() : "";
  if (!answer && results.length === 0) {
    throw new Error("Model response contained neither an answer nor tools");
  }
  return { answer, results };
}

export async function POST(req: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!userLimiter.allow(userId)) {
    return NextResponse.json({ error: RATE_LIMIT_MESSAGE }, { status: 429 });
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
  let history: HistoryTurn[] = [];
  if (chatId) {
    const chat = await prisma.aIChat.findFirst({
      where: { id: chatId, userId },
      select: { id: true },
    });
    if (!chat) {
      return NextResponse.json({ error: "Chat not found" }, { status: 404 });
    }
    history = await loadHistory(chatId);
  }

  const persistTurn = async (
    answer: string,
    results: AIResult[] | null,
    error: string | null,
  ) => {
    if (!chatId) return;
    await prisma.$transaction([
      prisma.aIChatMessage.create({
        data: { chatId, role: "user", content: query },
      }),
      prisma.aIChatMessage.create({
        data: {
          chatId,
          role: "assistant",
          content: answer,
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
  if (!chatId && cached && Date.now() - cached.at < CACHE_TTL_MS) {
    await persistTurn(cached.response.answer, cached.response.results, null);
    return NextResponse.json(cached.response);
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const prompt = promptFor(query, history);

  const call = async (grounded: boolean) =>
    ai.models.generateContent({
      model: MODEL,
      contents: prompt,
      config: {
        ...(grounded
          ? { tools: [{ googleSearch: {} }] }
          : { responseMimeType: "application/json" }),
        temperature: 0.3,
        maxOutputTokens: 5000,
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
      await persistTurn("", null, message);
      return NextResponse.json({ error: message }, { status: 502 });
    }
  } else {
    try {
      response = await call(true);
    } catch (error) {
      if (!isRateLimited(error)) {
        const message = error instanceof Error ? error.message : "AI search failed";
        await persistTurn("", null, message);
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
        await persistTurn("", null, message);
        return NextResponse.json({ error: message }, { status: 502 });
      }
    }
  }

  let parsed: AIResponse;
  try {
    parsed = parseResponse(response.text ?? "");
  } catch {
    const message = "AI returned an unparseable response";
    await persistTurn("", null, message);
    return NextResponse.json({ error: message }, { status: 502 });
  }

  if (!chatId) {
    if (cache.size >= CACHE_MAX) {
      const oldest = cache.keys().next().value;
      if (oldest) cache.delete(oldest);
    }
    cache.set(query, { at: Date.now(), response: parsed });
  }

  await persistTurn(parsed.answer, parsed.results, null);

  return NextResponse.json(parsed);
}
