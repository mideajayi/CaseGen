"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactElement } from "react";

export type CaseStudyDraft = {
  problem: string;
  process: string;
  solution: string;
  feedback: string;
  learnings: string;
};

export interface DraftOutputProps {
  draft:
    | {
        problem: string;
        process: string;
        solution: string;
        feedback: string;
        learnings: string;
      }
    | null;
  isLoading: boolean;
  error: string | null;
  streamText?: string;
  onReset: () => void;
}

// Builds a plain-text version of the draft suitable for clipboard and .txt export.
const buildPlainTextDraft = (draft: CaseStudyDraft): string => {
  const sections: Array<{ label: string; content: string }> = [
    { label: "THE PROBLEM", content: draft.problem },
    { label: "PROCESS & APPROACH", content: draft.process },
    { label: "SOLUTION", content: draft.solution },
    { label: "FEEDBACK", content: draft.feedback },
    { label: "LEARNINGS", content: draft.learnings },
  ];

  return sections
    .map((section) => `${section.label}\n\n${section.content}`)
    .join("\n\n — \n\n");
};

// Copies the provided text to the clipboard using the best available browser API.
const copyToClipboard = async (text: string): Promise<void> => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
};

// Renders a small clipboard icon for primary actions (matches Figma "Copy" instance).
const CopyIcon = (): ReactElement => (
  <svg
    className="h-5 w-5 shrink-0"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" />
    <path d="M15 2H9a1 1 0 00-1 1v2a1 1 0 001 1h6a1 1 0 001-1V3a1 1 0 00-1-1z" />
  </svg>
);

// Triggers a download of the provided text as a .txt file in the browser.
const downloadTextFile = (filename: string, text: string): void => {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
};

// Animates a string with a typewriter effect for the final rendered draft.
const TypewriterParagraph = ({ text }: { text: string }): ReactElement => {
  const [displayText, setDisplayText] = useState<string>("");

  // Re-start the animation whenever the full text changes.
  useEffect(() => {
    if (text.length === 0) return;

    let index = 0;
    const intervalMs = 16;

    // We rely on remounting (via `key`) when `text` changes, so we don't
    // synchronously clear state here (keeps React/ESLint happy).

    const timer = window.setInterval(() => {
      index += 1;
      setDisplayText(text.slice(0, index));

      if (index >= text.length) {
        window.clearInterval(timer);
      }
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [text]);

  return (
    <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-[#3f3f3f]">
      {displayText}
    </p>
  );
};

// Extracts a complete JSON string value for `key` from a streamed JSON text, when available.
const extractJsonStringField = (text: string, key: string): string | null => {
  const keyToken = `"${key}"`;
  const keyIndex = text.indexOf(keyToken);
  if (keyIndex === -1) return null;

  const colonIndex = text.indexOf(":", keyIndex + keyToken.length);
  if (colonIndex === -1) return null;

  const firstQuoteIndex = text.indexOf('"', colonIndex);
  if (firstQuoteIndex === -1) return null;

  // Reads the JSON string contents, respecting backslash escapes, until we find the closing quote.
  let i = firstQuoteIndex + 1;
  let raw = "";
  let isEscaped = false;
  for (; i < text.length; i++) {
    const ch = text[i];
    if (isEscaped) {
      raw += ch;
      isEscaped = false;
      continue;
    }

    if (ch === "\\") {
      raw += ch;
      isEscaped = true;
      continue;
    }

    if (ch === '"') {
      break;
    }

    raw += ch;
  }

  // If we never found the closing quote yet, we don't have a complete value.
  if (i >= text.length || text[i] !== '"') return null;

  try {
    // Re-wrap as a JSON string literal so JSON.parse can unescape it safely.
    const parsed = JSON.parse(`"${raw}"`) as unknown;
    return typeof parsed === "string" ? parsed : null;
  } catch {
    return null;
  }
};

// Chevron icon for expand/collapse
const ChevronIcon = ({ expanded }: { expanded: boolean }): ReactElement => (
  <svg
    className={`h-4 w-4 shrink-0 text-[#808080] transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden
  >
    <path d="m6 9 6 6 6-6" />
  </svg>
);

// Collapsible section component
const CollapsibleSection = ({
  title,
  content,
  defaultExpanded = true,
}: {
  title: string;
  content: string;
  defaultExpanded?: boolean;
}): ReactElement => {
  const [expanded, setExpanded] = useState<boolean>(defaultExpanded);

  return (
    <section className="px-3 py-4 sm:px-4">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between text-left"
      >
        <p className="text-xs font-medium text-[#808080]">{title}</p>
        <ChevronIcon expanded={expanded} />
      </button>
      {expanded && (
        <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-[#3f3f3f]">
          {content}
        </p>
      )}
    </section>
  );
};

// Renders the generated draft with copy and download actions, plus loading/error states.
const DraftOutput = ({
  draft,
  isLoading,
  error,
  streamText,
  onReset,
}: DraftOutputProps): ReactElement | null => {
  const [copied, setCopied] = useState<boolean>(false);
  const [showFinalDraft, setShowFinalDraft] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>("");

  // When draft becomes available, wait for typewriter animations to finish before showing final view
  useEffect(() => {
    if (draft && !isLoading) {
      const sections = [draft.problem, draft.process, draft.solution, draft.feedback, draft.learnings];
      const maxLength = Math.max(...sections.map((s) => s.length));
      const animationTime = maxLength * 16;

      const timer = window.setTimeout(() => {
        setShowFinalDraft(true);
      }, animationTime);

      return () => window.clearTimeout(timer);
    } else if (!draft) {
      setShowFinalDraft(false);
    }
  }, [draft, isLoading]);

  useEffect(() => {
    if (!isLoading) {
      setLoadingMessage("");
      return;
    }

    setLoadingMessage("Reading your notes...");
    const firstTimer = window.setTimeout(() => {
      setLoadingMessage("Structuring your case study...");
    }, 4000);
    const secondTimer = window.setTimeout(() => {
      setLoadingMessage("Almost there — refining the draft...");
    }, 9000);

    return () => {
      window.clearTimeout(firstTimer);
      window.clearTimeout(secondTimer);
    };
  }, [isLoading]);

  const plainText = useMemo(() => {
    if (!draft) return "";
    return buildPlainTextDraft(draft);
  }, [draft]);

  const handleCopyAll = async (): Promise<void> => {
    if (!draft) return;
    await copyToClipboard(plainText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = (): void => {
    if (!draft) return;
    downloadTextFile("casegen-draft.txt", plainText);
  };

  const handleReset = (): void => {
    setCopied(false);
    onReset();
  };

  // Extract preview data at top level so it's available in both loading and final states
  const problemPreview = streamText
    ? extractJsonStringField(streamText, "problem")
    : draft?.problem || null;
  const processPreview = streamText
    ? extractJsonStringField(streamText, "process")
    : draft?.process || null;
  const solutionPreview = streamText
    ? extractJsonStringField(streamText, "solution")
    : draft?.solution || null;
  const feedbackPreview = streamText
    ? extractJsonStringField(streamText, "feedback")
    : draft?.feedback || null;
  const learningsPreview = streamText
    ? extractJsonStringField(streamText, "learnings")
    : draft?.learnings || null;

  const rateLimitError = error?.toLowerCase().includes("rate limit");
  const errorMessage = rateLimitError
    ? "Too many requests — please wait 30 seconds and try again."
    : `Something went wrong: ${error}. Please try again.`;

  if (isLoading) {
    return (
      <section
        id="draft-output"
        className="space-y-4 rounded-2xl border border-[#eeeeee] bg-white p-4"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h2 className="text-base font-medium text-[#3f3f3f]">Draft</h2>
            <p className="text-sm text-[#c3c3c3]">
              {loadingMessage || "Generating your case study draft..."}
            </p>
          </div>
          <div className="h-9 w-[102px] animate-pulse rounded-full bg-[#e8e8e8]" />
        </div>

        <div className="divide-y divide-[#eeeeee] overflow-hidden rounded-xl border border-[#eeeeee] bg-white">
          {[
            "The Problem",
            "Process & Approach",
            "Solution",
            "Feedback",
            "Learnings",
          ].map((sectionTitle) => (
            <section key={sectionTitle} className="px-3 py-4 sm:px-4">
              <p className="text-xs font-medium text-[#808080]">{sectionTitle}</p>
              <div className="mt-3 space-y-2">
                <div className="h-3 w-full animate-pulse rounded bg-[#e8e8e8]" />
                <div className="h-3 w-11/12 animate-pulse rounded bg-[#e8e8e8]" />
                <div className="h-3 w-10/12 animate-pulse rounded bg-[#e8e8e8]" />
              </div>
            </section>
          ))}
        </div>
      </section>
    );
  }

  if (!showFinalDraft && draft) {
    return (
      <section className="space-y-4 rounded-2xl border border-[#eeeeee] bg-white p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <h2 className="text-base font-medium text-[#3f3f3f]">Draft</h2>
            <p className="text-sm text-[#c3c3c3]">Edit before publishing.</p>
          </div>
        </div>

        <div className="divide-y divide-[#eeeeee] overflow-hidden rounded-xl border border-[#eeeeee] bg-white">
          <section className="px-3 py-4 sm:px-4">
            <p className="text-xs font-medium text-[#808080]">The Problem</p>
            {problemPreview ? (
              <TypewriterParagraph key={problemPreview} text={problemPreview} />
            ) : (
              <div className="mt-3 animate-pulse space-y-2">
                <div className="h-3 w-full rounded bg-[#e8e8e8]" />
                <div className="h-3 w-11/12 rounded bg-[#e8e8e8]" />
                <div className="h-3 w-10/12 rounded bg-[#e8e8e8]" />
              </div>
            )}
          </section>

          <section className="px-3 py-4 sm:px-4">
            <p className="text-xs font-medium text-[#808080]">
              Process &amp; Approach
            </p>
            {processPreview ? (
              <TypewriterParagraph key={processPreview} text={processPreview} />
            ) : (
              <div className="mt-3 animate-pulse space-y-2">
                <div className="h-3 w-full rounded bg-[#e8e8e8]" />
                <div className="h-3 w-11/12 rounded bg-[#e8e8e8]" />
                <div className="h-3 w-10/12 rounded bg-[#e8e8e8]" />
              </div>
            )}
          </section>

          <section className="px-3 py-4 sm:px-4">
            <p className="text-xs font-medium text-[#808080]">Solution</p>
            {solutionPreview ? (
              <TypewriterParagraph key={solutionPreview} text={solutionPreview} />
            ) : (
              <div className="mt-3 animate-pulse space-y-2">
                <div className="h-3 w-full rounded bg-[#e8e8e8]" />
                <div className="h-3 w-11/12 rounded bg-[#e8e8e8]" />
                <div className="h-3 w-10/12 rounded bg-[#e8e8e8]" />
              </div>
            )}
          </section>

          <section className="px-3 py-4 sm:px-4">
            <p className="text-xs font-medium text-[#808080]">Feedback</p>
            {feedbackPreview ? (
              <TypewriterParagraph key={feedbackPreview} text={feedbackPreview} />
            ) : (
              <div className="mt-3 animate-pulse space-y-2">
                <div className="h-3 w-full rounded bg-[#e8e8e8]" />
                <div className="h-3 w-11/12 rounded bg-[#e8e8e8]" />
                <div className="h-3 w-10/12 rounded bg-[#e8e8e8]" />
              </div>
            )}
          </section>

          <section className="px-3 py-4 sm:px-4">
            <p className="text-xs font-medium text-[#808080]">Learnings</p>
            {learningsPreview ? (
              <TypewriterParagraph key={learningsPreview} text={learningsPreview} />
            ) : (
              <div className="mt-3 animate-pulse space-y-2">
                <div className="h-3 w-full rounded bg-[#e8e8e8]" />
                <div className="h-3 w-11/12 rounded bg-[#e8e8e8]" />
                <div className="h-3 w-10/12 rounded bg-[#e8e8e8]" />
              </div>
            )}
          </section>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="space-y-4 rounded-2xl border border-[#eeeeee] bg-white p-4">
        <h2 className="text-base font-medium text-[#3f3f3f]">Draft</h2>
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          {errorMessage}
        </div>
        <button
          type="button"
          onClick={handleReset}
          className="inline-flex h-9 w-full items-center justify-center rounded-full bg-[#082cd0] px-5 text-sm font-medium text-white shadow-sm transition hover:bg-[#061fa8]"
        >
          Try again
        </button>
      </section>
    );
  }

  if (!draft) return null;

  // Show final draft once animations are complete
  if (showFinalDraft && draft) {
    return (
      <section
        id="draft-output"
        className="fade-in space-y-4 rounded-2xl border border-[#eeeeee] bg-white p-4"
      >
        <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h2 className="text-base font-medium text-[#3f3f3f]">Draft</h2>
            <p className="text-sm text-[#c3c3c3]">Edit before publishing.</p>
          </div>

          <button
            type="button"
            onClick={handleCopyAll}
            className="inline-flex h-9 w-full items-center justify-center gap-1 rounded-full bg-[#082cd0] px-3 text-sm font-medium text-white shadow-sm transition hover:bg-[#061fa8] sm:w-auto sm:min-w-[102px]"
          >
            {copied ? "Copied!" : "Copy all"}
            {!copied && <CopyIcon />}
          </button>
        </header>

        <div className="divide-y divide-[#eeeeee] overflow-hidden rounded-xl border border-[#eeeeee] bg-white">
          <CollapsibleSection title="The Problem" content={draft.problem} />
          <CollapsibleSection title="Process & Approach" content={draft.process} />
          <CollapsibleSection title="Solution" content={draft.solution} />
          <CollapsibleSection title="Feedback" content={draft.feedback} />
          <CollapsibleSection title="Learnings" content={draft.learnings} />
        </div>

        <button
          type="button"
          onClick={handleDownload}
          className="inline-flex h-11 w-full items-center justify-center rounded-full border border-[#eeeeee] bg-white px-6 text-base font-medium text-[#3f3f3f] shadow-sm transition hover:bg-[#fafafa]"
        >
          Download as .txt
        </button>
      </section>
    );
  }

  return null;
};

export default DraftOutput;

