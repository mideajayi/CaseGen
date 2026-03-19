import { NextRequest, NextResponse } from "next/server";

type GenerateRequestBody = {
  notes: string;
  images?: string[];
};

type CaseStudyDraft = {
  problem: string;
  process: string;
  decisions: string;
  results: string;
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
    typeof record.problem === "string" &&
    typeof record.process === "string" &&
    typeof record.decisions === "string" &&
    typeof record.results === "string"
  );
};

// Extracts the first choice message content string from a chat completion response.
const extractChatCompletionContent = (value: unknown): string | null => {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const choices = record.choices;
  if (!Array.isArray(choices) || choices.length === 0) return null;

  const firstChoice = choices[0];
  if (!firstChoice || typeof firstChoice !== "object") return null;

  const choiceRecord = firstChoice as Record<string, unknown>;
  const message = choiceRecord.message;
  if (!message || typeof message !== "object") return null;

  const messageRecord = message as Record<string, unknown>;
  const content = messageRecord.content;
  return typeof content === "string" ? content : null;
};

// Calls OpenAI with the provided prompt content and returns the parsed draft object.
const callOpenAIForDraft = async (params: {
  notes: string;
  images: string[];
}): Promise<CaseStudyDraft> => {
  const { SYSTEM_PROMPT, buildUserPrompt } = await import(
    "@/lib/prompt"
  ) as {
    SYSTEM_PROMPT: string;
    buildUserPrompt: (notes: string, imageCount: number) => string;
  };

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Missing OPENAI_API_KEY. Add it to your .env.local file."
    );
  }

  const preferredModel = "gpt-5.4-mini";
  const fallbackModels = ["gpt-5.4", "gpt-4o-mini", "gpt-4o"];
  const modelCandidates = [preferredModel, ...fallbackModels];

  const userPrompt = buildUserPrompt(params.notes, params.images.length);

  const imageParts = params.images.map((img) => {
    const url = toImageDataUrl(img);
    return {
      type: "image_url",
      image_url: { url },
    };
  });

  const userContent = [
    { type: "text", text: userPrompt },
    ...imageParts,
  ];

  let lastError: unknown = null;

  for (const model of modelCandidates) {
    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          temperature: 0.4,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: userContent },
          ],
          response_format: { type: "json_object" },
        }),
      });

      if (!response.ok) {
        const errorBody = (await response.json()) as unknown;
        let message = "OpenAI request failed.";
        if (
          errorBody &&
          typeof errorBody === "object" &&
          "error" in errorBody
        ) {
          const errorRecord = errorBody as Record<string, unknown>;
          const error = errorRecord.error;
          if (
            error &&
            typeof error === "object" &&
            "message" in error &&
            typeof (error as Record<string, unknown>).message === "string"
          ) {
            message = (error as Record<string, unknown>).message as string;
          }
        }
        const modelNotFound =
          message.toLowerCase().includes("model") ||
          message.toLowerCase().includes("not found");
        if (modelNotFound) {
          lastError = new Error(message);
          continue;
        }
        throw new Error(message);
      }

      const data = (await response.json()) as unknown;
      const content = extractChatCompletionContent(data);

      if (!content) {
        throw new Error("OpenAI returned an empty response.");
      }

      const parsed = JSON.parse(content) as unknown;
      if (!isCaseStudyDraft(parsed)) {
        throw new Error("OpenAI returned JSON with an unexpected shape.");
      }

      return parsed;
    } catch (err) {
      lastError = err;
    }
  }

  const message =
    lastError instanceof Error ? lastError.message : "Failed to generate draft.";
  throw new Error(message);
};

// Handles POST requests to /api/generate by validating the input and returning a structured case study draft.
export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = (await request.json()) as GenerateRequestBody;

  if (!body.notes || body.notes.trim().length === 0) {
    return NextResponse.json({ error: "Notes are required" }, { status: 400 });
  }

  const images = Array.isArray(body.images) ? body.images : [];

  // eslint-disable-next-line no-console
  console.log("CaseGen /api/generate called", {
    notesLength: body.notes.length,
  });

  try {
    const draft = await callOpenAIForDraft({
      notes: body.notes,
      images,
    });

    return NextResponse.json({
      success: true,
      draft,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Generation failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}


