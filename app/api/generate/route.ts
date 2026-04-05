import { NextRequest, NextResponse } from "next/server";

type GenerateRequestBody = {
  notes: string;
  images?: string[];
};

type CaseStudyDraft = {
  meta: string;
  problem: string;
  process: string;
  solution: string;
  decisions: string;
  learnings: string;
};

// Converts a base64 string or a data URL into a data URL suitable for vision input.
const toImageDataUrl = (image: string): string => {
  if (image.startsWith("data:")) return image;
  return `data:image/png;base64,${image}`;
};

// Checks whether a parsed value matches the expected draft shape.
const isCaseStudyDraft = (value: unknown): value is CaseStudyDraft => {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.meta === "string" &&
    typeof record.problem === "string" &&
    typeof record.process === "string" &&
    typeof record.solution === "string" &&
    typeof record.decisions === "string" &&
    typeof record.learnings === "string"
  );
};

// Extracts the next streamed content delta from a streamed chat completion chunk.
const extractChatCompletionStreamDelta = (value: unknown): string | null => {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const choices = record.choices;
  if (!Array.isArray(choices) || choices.length === 0) return null;

  const firstChoice = choices[0] as unknown;
  if (!firstChoice || typeof firstChoice !== "object") return null;

  const choiceRecord = firstChoice as Record<string, unknown>;
  const delta = choiceRecord.delta;
  if (!delta || typeof delta !== "object") return null;

  const deltaRecord = delta as Record<string, unknown>;
  const content = deltaRecord.content;
  return typeof content === "string" ? content : null;
};

// Handles POST requests to /api/generate by validating the input and returning a structured case study draft.
export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = (await request.json()) as GenerateRequestBody;

  if (!body.notes || body.notes.trim().length === 0) {
    return NextResponse.json({ error: "Notes are required" }, { status: 400 });
  }

  const images = Array.isArray(body.images) ? body.images : [];

  console.log("CaseGen /api/generate called", {
    notesLength: body.notes.length,
  });

  const { SYSTEM_PROMPT, buildUserPrompt } = await import(
    "@/lib/prompt"
  ) as {
    SYSTEM_PROMPT: string;
    buildUserPrompt: (notes: string, imageCount: number) => string;
  };

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing OPENAI_API_KEY. Add it to your .env.local file." },
      { status: 500 },
    );
  }

  const preferredModel = "gpt-5-mini";
  const fallbackModels = ["gpt-4o-mini"];
  const modelCandidates = [preferredModel, ...fallbackModels];

  const userPrompt = buildUserPrompt(body.notes, images.length);

  const imageParts = images.map((img) => {
    const url = toImageDataUrl(img);
    return {
      type: "image_url",
      image_url: { url },
    };
  });

  const userContent = [{ type: "text", text: userPrompt }, ...imageParts];

  let openaiResponse: Response | null = null;
  let lastErrorMessage = "OpenAI request failed.";

  for (const model of modelCandidates) {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        max_tokens: 900,
        stream: true,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (response.ok) {
      openaiResponse = response;
      break;
    }

    const errorBody = (await response.json()) as unknown;
    if (
      errorBody &&
      typeof errorBody === "object" &&
      "error" in errorBody &&
      typeof (errorBody as Record<string, unknown>).error === "object"
    ) {
      const errorRecord = (errorBody as Record<string, unknown>)
        .error as Record<string, unknown>;
      const message =
        typeof errorRecord.message === "string"
          ? errorRecord.message
          : "OpenAI request failed.";
      lastErrorMessage = message;
    }

    const lower = lastErrorMessage.toLowerCase();
    if (lower.includes("model") || lower.includes("not found")) {
      continue;
    }
    return NextResponse.json({ error: lastErrorMessage }, { status: 500 });
  }

  if (!openaiResponse) {
    return NextResponse.json({ error: lastErrorMessage }, { status: 500 });
  }

  if (!openaiResponse.body) {
    return NextResponse.json(
      { error: "OpenAI returned an empty streaming body." },
      { status: 500 },
    );
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = openaiResponse.body?.getReader();
      if (!reader) {
        controller.enqueue(
          encoder.encode(
            `event: error\ndata: ${JSON.stringify(
              "OpenAI stream reader was unavailable.",
            )}\n\n`,
          ),
        );
        controller.close();
        return;
      }

      let buffer = "";
      let fullContent = "";

      // Reads OpenAI's streaming response and forwards it to the browser as SSE.
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (!value) continue;

        buffer += decoder.decode(value, { stream: true });

        // OpenAI streams events separated by blank lines.
        while (true) {
          const eventEndIndex = buffer.indexOf("\n\n");
          if (eventEndIndex === -1) break;

          const rawEvent = buffer.slice(0, eventEndIndex);
          buffer = buffer.slice(eventEndIndex + 2);

          const lines = rawEvent
            .split("\n")
            .map((line) => line.trim())
            .filter(Boolean);
          const dataLine = lines.find((line) => line.startsWith("data:"));
          if (!dataLine) continue;

          const data = dataLine.replace(/^data:\s*/, "");
          if (data === "[DONE]") {
            break;
          }

          const parsed = JSON.parse(data) as unknown;
          const delta = extractChatCompletionStreamDelta(parsed);
          if (delta) {
            fullContent += delta;
            controller.enqueue(
              encoder.encode(
                `event: delta\ndata: ${JSON.stringify(delta)}\n\n`,
              ),
            );
          }
        }
      }

      try {
        const parsed = JSON.parse(fullContent) as unknown;
        if (!isCaseStudyDraft(parsed)) {
          throw new Error("OpenAI returned JSON with an unexpected shape.");
        }

        console.log("CaseGen extraction meta:", (parsed as CaseStudyDraft).meta);

        controller.enqueue(
          encoder.encode(
            `event: done\ndata: ${JSON.stringify(parsed)}\n\n`,
          ),
        );
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Failed to parse OpenAI streamed JSON.";
        controller.enqueue(
          encoder.encode(`event: error\ndata: ${JSON.stringify(message)}\n\n`),
        );
      }

      controller.close();
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}