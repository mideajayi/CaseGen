"use client";

import { useMemo, useState } from "react";
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

// Renders the generated draft with copy and download actions, plus loading/error states.
const DraftOutput = ({
  draft,
  isLoading,
  error,
  onReset,
}: DraftOutputProps): ReactElement | null => {
  const [copied, setCopied] = useState<boolean>(false);

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

  if (isLoading) {
    return (
      <section className="space-y-5 rounded-2xl border border-zinc-800 bg-zinc-950/80 p-5 shadow-lg shadow-black/40 ring-1 ring-zinc-900/60 backdrop-blur-sm sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-400">
            Draft
          </h2>
          <div className="h-9 w-24 rounded-full bg-zinc-900/70 animate-pulse" />
        </div>

        <div className="animate-pulse space-y-4">
          {[0, 1, 2, 3, 4].map((idx) => (
            <div
              key={idx}
              className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4"
            >
              <div className="h-3 w-32 rounded bg-zinc-800" />
              <div className="mt-3 space-y-2">
                <div className="h-3 w-full rounded bg-zinc-800" />
                <div className="h-3 w-11/12 rounded bg-zinc-800" />
                <div className="h-3 w-10/12 rounded bg-zinc-800" />
              </div>
            </div>
          ))}
        </div>

        <p className="text-sm text-zinc-300">
          Generating your case study draft...
        </p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-950/80 p-5 shadow-lg shadow-black/40 ring-1 ring-zinc-900/60 backdrop-blur-sm sm:p-6">
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-400">
          Draft
        </h2>
        <div className="rounded-xl border border-rose-900/60 bg-rose-950/40 p-4 text-sm text-rose-200">
          Generation failed. {error}. Please try again.
        </div>
        <button
          type="button"
          onClick={handleReset}
          className="inline-flex h-[44px] w-full items-center justify-center rounded-full bg-zinc-100 px-5 text-sm font-semibold text-zinc-900 shadow-sm transition hover:bg-zinc-200"
        >
          Try again
        </button>
      </section>
    );
  }

  if (!draft) return null;

  return (
    <section className="space-y-5 rounded-2xl border border-zinc-800 bg-zinc-950/80 p-5 shadow-lg shadow-black/40 ring-1 ring-zinc-900/60 backdrop-blur-sm sm:p-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-400">
            Draft
          </h2>
          <p className="text-xs text-zinc-500">This is a draft — edit before publishing.</p>
        </div>

        <button
          type="button"
          onClick={handleCopyAll}
          className="inline-flex h-[44px] items-center justify-center rounded-full bg-zinc-100 px-5 text-sm font-semibold text-zinc-900 shadow-sm transition hover:bg-zinc-200"
        >
          {copied ? "Copied!" : "Copy all"}
        </button>
      </header>

      <div className="divide-y divide-zinc-800 rounded-xl border border-zinc-800 bg-zinc-900/40">
        <section className="p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
            The Problem
          </p>
          <p className="mt-3 text-sm leading-relaxed text-zinc-200">
            {draft.problem}
          </p>
        </section>

        <section className="p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Process &amp; Approach
          </p>
          <p className="mt-3 text-sm leading-relaxed text-zinc-200">
            {draft.process}
          </p>
        </section>

        <section className="p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Solution
          </p>
          <p className="mt-3 text-sm leading-relaxed text-zinc-200">
            {draft.solution}
          </p>
        </section>

        <section className="p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Feedback
          </p>
          <p className="mt-3 text-sm leading-relaxed text-zinc-200">
            {draft.feedback}
          </p>
        </section>

        <section className="p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
            Learnings
          </p>
          <p className="mt-3 text-sm leading-relaxed text-zinc-200">
            {draft.learnings}
          </p>
        </section>
      </div>

      <button
        type="button"
        onClick={handleDownload}
        className="inline-flex h-[44px] w-full items-center justify-center rounded-full border border-zinc-700 bg-zinc-900/60 px-6 text-sm font-semibold text-zinc-100 shadow-sm transition hover:bg-zinc-900"
      >
        Download as .txt
      </button>
    </section>
  );
};

export default DraftOutput;

