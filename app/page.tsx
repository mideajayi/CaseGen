"use client";

import InputForm from "@/components/InputForm";
import DraftOutput from "@/components/DraftOutput";

import { useState } from "react";
import type { CaseStudyDraft } from "@/components/DraftOutput";

export default function Home() {
  const [draft, setDraft] = useState<CaseStudyDraft | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [streamText, setStreamText] = useState<string>("");

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 px-4 py-10 text-slate-50">
      <div className="mx-auto flex max-w-5xl flex-col gap-10 lg:gap-12">
        <header className="space-y-4">
          <p className="inline-flex items-center rounded-full bg-slate-900/80 px-3 py-1 text-xs font-medium text-slate-300 ring-1 ring-slate-700/80">
            CaseGen · draft your UX case studies faster
          </p>
          <h1 className="text-balance text-3xl font-semibold tracking-tight text-slate-50 sm:text-4xl lg:text-5xl">
            Turn your messy project notes into structured case study drafts.
          </h1>
          <p className="max-w-2xl text-sm text-slate-300 sm:text-base">
            Paste your notes, add screenshots, and let CaseGen suggest a clear,
            narrative-style draft you can refine and publish.
          </p>
        </header>

        <section className="grid gap-6 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] items-start">
          <InputForm
            isLoading={isLoading}
            onGenerationStart={() => {
              setIsLoading(true);
              setError(null);
              setStreamText("");
            }}
            onGenerationError={(message) => {
              setIsLoading(false);
              setError(message);
              setStreamText("");
            }}
            onDraftGenerated={(newDraft) => {
              setIsLoading(false);
              setError(null);
              setDraft(newDraft);
              setStreamText("");
            }}
            onStreamTextUpdate={(text) => setStreamText(text)}
          />
          <DraftOutput
            draft={draft}
            isLoading={isLoading}
            error={error}
            streamText={streamText}
            onReset={() => {
              setIsLoading(false);
              setError(null);
              setDraft(null);
              setStreamText("");
            }}
          />
        </section>
      </div>
    </main>
  );
}

