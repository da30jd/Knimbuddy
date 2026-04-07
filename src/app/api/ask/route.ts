import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";

export const runtime = "nodejs";

type ChatMessage = { role: "user" | "assistant"; content: string };

const SYSTEM_PROMPT = `You are KnimBuddy, a study assistant answering questions about a specific document the student has provided. Follow these rules strictly:

1. Answer ONLY using information in the provided document text. Do not use outside knowledge.
2. If the answer is not in the document, respond with exactly: "This doesn't appear to be covered in the uploaded material."
3. When you do answer, always reference the source — begin with a phrase like "According to the text..." or "The document states..." and, when helpful, briefly quote or paraphrase the relevant passage.
4. Keep answers concise and directly grounded in the document.
5. Use prior conversation turns for context when the student asks follow-up questions.`;

export async function POST(req: NextRequest) {
  console.log("[/api/ask] POST received");

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response("API key not found", { status: 500 });
  }

  const { context, messages } = (await req.json()) as {
    context?: string;
    messages?: ChatMessage[];
  };

  if (!context || !context.trim()) {
    return new Response("Missing document context", { status: 400 });
  }
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return new Response("Missing messages", { status: 400 });
  }

  console.log(
    "[/api/ask] contextLen:",
    context.length,
    "messages:",
    messages.length
  );

  const client = new Anthropic({ apiKey });

  const system = `${SYSTEM_PROMPT}\n\n---\nDOCUMENT TEXT:\n${context}\n---`;

  const stream = client.messages.stream({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    system,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
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
        console.error("[/api/ask] stream error", err);
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
