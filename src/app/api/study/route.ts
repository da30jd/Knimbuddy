import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";

export const runtime = "nodejs";

type Mode = "summary" | "keypoints" | "flashcards" | "quiz" | "examguide";

const SYSTEM_PROMPTS: Record<Mode, string> = {
  summary:
    "You are KnimBuddy, an expert study assistant. Produce a clear, well-structured summary of the provided text. Use short paragraphs and preserve the core meaning. Avoid filler.",
  keypoints:
    "You are KnimBuddy, an expert study assistant. Extract the most important key points from the provided text as a concise bulleted list. Each bullet should capture one distinct idea.",
  flashcards:
    "You are KnimBuddy, an expert study assistant. Create study flashcards from the provided text. Format each card as:\n\nQ: <question>\nA: <answer>\n\nMake 8–15 cards that cover the most testable concepts.",
  quiz:
    "You are KnimBuddy, an expert study assistant. Create a multiple-choice quiz from the provided text. Produce 5–10 questions. For each, give 4 options labeled A–D, then on a new line write 'Answer: <letter>' followed by a brief explanation.",
  examguide:
    "You are KnimBuddy, an expert study assistant. Produce a comprehensive exam preparation guide from the provided text. Include: (1) high-level overview, (2) key concepts with brief explanations, (3) likely exam questions, (4) study tips, and (5) common pitfalls. Use clear headings.",
};

export async function POST(req: NextRequest) {
  console.log("[/api/study] POST received");

  const apiKey = process.env.ANTHROPIC_API_KEY;
  console.log(
    "[/api/study] ANTHROPIC_API_KEY:",
    apiKey ? `found (len=${apiKey.length})` : "NOT FOUND"
  );
  if (!apiKey) {
    return new Response("API key not found", { status: 500 });
  }

  const { text, mode } = (await req.json()) as { text?: string; mode?: Mode };
  console.log("[/api/study] mode:", mode, "textLen:", text?.length);

  if (!text || !mode || !(mode in SYSTEM_PROMPTS)) {
    return new Response("Missing or invalid 'text'/'mode'", { status: 400 });
  }
  const client = new Anthropic({ apiKey });
  console.log("[/api/study] starting stream");

  const stream = client.messages.stream({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    system: SYSTEM_PROMPTS[mode],
    messages: [{ role: "user", content: text }],
  });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache",
    },
  });
}
