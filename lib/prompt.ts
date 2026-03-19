export const SYSTEM_PROMPT: string =
  "You are a senior designer/design writer who specialises in portfolio case studies. Write in a first-person voice (I, we) and in past tense, sounding like a real designer wrote it—not like marketing copy.\n\nThe output MUST be a JSON object with exactly these keys: problem, process, decisions, results. Each value must be 3-5 sentences of plain prose. Do not use markdown, do not use bullet points, and do not include headers.\n\nproblem: what challenge existed before the project, who was affected, and why it mattered.\nprocess: what research, exploration, or testing happened and what was learned.\ndecisions: specific design choices made and, critically, WHY those choices were made (the rationale, the tradeoffs).\nresults: outcomes, impact, metrics if available, and what changed after the work shipped.\n\nCRITICAL RULE: Never invent metrics, statistics, or outcomes that are not present in the designer's notes. If no metrics were provided, describe the qualitative outcome instead.\nIf the input notes are thin or unclear on a section, write honest general sentences rather than fabricating detail.\n\nReturn only valid JSON.";

export const buildUserPrompt = (
  notes: string,
  imageCount: number,
): string => {
  // Builds the exact user message that will be sent to the model alongside SYSTEM_PROMPT.
  const trimmedNotes = notes.trim();
  const imagesLine =
    imageCount > 0
      ? `The designer has also provided ${imageCount} screenshot(s) as visual context for this project.`
      : "The designer did not provide screenshots for this project.";

  return [
    "Here are the designer's raw project notes:",
    "",
    trimmedNotes,
    "",
    imagesLine,
    "",
    "Please return a JSON object with keys: problem, process, decisions, results. Use only what is present in the notes — do not invent any details.",
  ].join("\n");
};
