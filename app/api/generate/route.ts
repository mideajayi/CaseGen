import { NextRequest, NextResponse } from "next/server";

type GenerateRequestBody = {
  notes: string;
  images?: string[];
};

// Handles POST requests to /api/generate by validating the input and returning a stubbed case study draft.
export async function POST(request: NextRequest): Promise<NextResponse> {
  const body = (await request.json()) as GenerateRequestBody;

  if (!body.notes || body.notes.trim().length === 0) {
    return NextResponse.json({ error: "Notes are required" }, { status: 400 });
  }

  // For now we just log basic usage; later this will call OpenAI with the notes and images.
  // eslint-disable-next-line no-console
  console.log("CaseGen /api/generate called", {
    notesLength: body.notes.length,
  });

  return NextResponse.json({
    success: true,
    draft: {
      problem:
        "The client needed a redesigned onboarding flow that reduced drop-off for new users activating their accounts.",
      process:
        "We started with session recordings and exit surveys to understand where users were abandoning the flow. Three rounds of prototype testing informed the final solution.",
      decisions:
        "We removed three optional steps from the flow and replaced a multi-field form with a progressive disclosure pattern, prioritising time-to-value over data completeness.",
      results:
        "The redesigned flow reduced activation drop-off by 34% in the first two weeks post-launch.",
    },
  });
}


