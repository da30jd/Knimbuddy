import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 60;

type Mode = "summary" | "keypoints" | "flashcards" | "quiz" | "examguide";

const SYSTEM_PROMPTS: Record<Mode, string> = {
  summary:
    "You are KnimBuddy, an expert study assistant. Produce a clear, well-structured summary of the provided text. Use short paragraphs and preserve the core meaning. Avoid filler.",
  keypoints:
    "You are KnimBuddy, an expert study assistant. Extract the most important key points from the provided text as a concise bulleted list. Each bullet should capture one distinct idea.",
  flashcards:
    "You are KnimBuddy, an expert study assistant. Create study flashcards from the provided text. Output ONLY flashcards in this exact format, with one blank line between cards and nothing else (no headings, no intro):\n\nQ: <question>\nA: <answer>\n\nMake 8–15 cards covering the most testable concepts.",
  quiz:
    "You are KnimBuddy, an expert study assistant. Create a multiple-choice quiz from the provided text. Produce 5–10 questions. Format strictly as Markdown:\n\n**1. <question text>**\nA. <option>\nB. <option>\nC. <option>\nD. <option>\n\n(repeat for each question, with a blank line between questions)\n\nAfter ALL questions and options have been listed, add a heading `## Answers` followed by one line per question in the form `1. <letter> — <brief explanation>`. Do not reveal answers next to the questions; they go only in the Answers section at the bottom.",
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

  const { text, mode, nonce, focus } = (await req.json()) as {
    text?: string;
    mode?: Mode;
    nonce?: string | number;
    focus?: string;
  };
  console.log("[/api/study] mode:", mode, "textLen:", text?.length);

  if (!text || !mode || !(mode in SYSTEM_PROMPTS)) {
    return new Response("Missing or invalid 'text'/'mode'", { status: 400 });
  }
  const client = new Anthropic({ apiKey });
  console.log("[/api/study] starting stream");

  const wantsVariety = mode === "flashcards" || mode === "quiz";
  let userContent = text;
  if (nonce) {
    userContent += `\n\n---\n(Variation token: ${nonce}. Produce a fresh set that does NOT repeat questions from previous generations — pick different concepts, angles, or phrasings.)`;
  }
  if (focus && focus.trim()) {
    userContent += `\n\n---\nFOCUS: The student previously missed questions in the following areas. Generate a NEW quiz that specifically targets these weak areas with fresh questions (do not repeat the previous questions verbatim, but cover the same underlying concepts):\n${focus}`;
  }

  const stream = client.messages.stream({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    temperature: wantsVariety ? 1 : 0.3,
    system: SYSTEM_PROMPTS[mode],
    messages: [{ role: "user", content: userContent }],
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
