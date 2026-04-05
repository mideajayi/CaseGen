import { NextRequest, NextResponse } from "next/server";

type ExtractRequestBody = {
  notes: string;
  images?: string[];
};

const toImageDataUrl = (image: string): string => {
  if (image.startsWith("data:")) return image;
  return `data:image/png;base64,${image}`;
};

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = (await request.json()) as ExtractRequestBody;

  if (!body.notes || body.notes.trim().length === 0) {
    return NextResponse.json({ error: "Notes are required" }, { status: 400 });
  }

  const images = Array.isArray(body.images) ? body.images : [];

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Missing OPENAI_API_KEY." }, { status: 500 });
  }

  const { buildExtractionPrompt } = await import("@/lib/prompt") as {
    buildExtractionPrompt: (notes: string, imageCount: number) => string;
  };

  const imageParts = images.map((img) => ({
    type: "image_url",
    image_url: { url: toImageDataUrl(img) },
  }));

  const userContent = [
    { type: "text", text: buildExtractionPrompt(body.notes, images.length) },
    ...imageParts,
  ];

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0.1,
      max_tokens: 300,
      messages: [
        {
          role: "system",
          content:
            "You are a detail extractor. Read the designer's notes carefully and extract project metadata. Return ONLY a JSON object with these exact keys: timeline, platform, team, tools, persona1, persona2, quote, constraints, outcomes. Every value must be a plain string — never return objects, arrays, or nested JSON. For personas, format as a single string like 'Inti, 35, Social media manager'. If a field is not present write 'not specified'. Never infer or guess platform, timeline, or ages — copy them exactly as written.",
        },
        { role: "user", content: userContent },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    return NextResponse.json({ error: "Extraction failed." }, { status: 500 });
  }

  const data = (await response.json()) as {
    choices: Array<{ message: { content: string } }>;
  };

  const raw = data.choices[0]?.message?.content ?? "{}";

  try {
    const parsed = JSON.parse(raw) as Record<string, string>;
    const meta = [
      `Timeline: ${parsed.timeline ?? "not specified"}`,
      `Platform: ${parsed.platform ?? "not specified"}`,
      `Team: ${parsed.team ?? "not specified"}`,
      `Tools: ${parsed.tools ?? "not specified"}`,
      `Persona 1: ${parsed.persona1 ?? "not specified"}`,
      `Persona 2: ${parsed.persona2 ?? "not specified"}`,
      `Quote: ${parsed.quote ?? "not specified"}`,
      `Constraints: ${parsed.constraints ?? "not specified"}`,
      `Outcomes: ${parsed.outcomes ?? "not specified"}`,
    ].join(" | ");

    return NextResponse.json({ meta });
  } catch {
    return NextResponse.json({ error: "Failed to parse extraction." }, { status: 500 });
  }
}