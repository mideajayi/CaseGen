"use client";

import InputForm from "@/components/InputForm";
import DraftOutput from "@/components/DraftOutput";

import { useEffect, useState } from "react";
import type { CaseStudyDraft } from "@/components/DraftOutput";

export default function Home() {
  const [draft, setDraft] = useState<CaseStudyDraft | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [streamText, setStreamText] = useState<string>("");

  useEffect(() => {
    if (!draft) return;

    const target = document.getElementById("draft-output");
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [draft]);

  return (
    <main className="min-h-screen overflow-y-auto bg-gradient-to-b from-slate-950 via-slate-950 to-slate-900 px-4 py-10 text-slate-50">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 sm:gap-10 lg:gap-12">
        <section className="mx-auto w-full max-w-2xl rounded-3xl border border-slate-800 bg-slate-950/80 p-6 text-center shadow-lg shadow-black/20 sm:p-8">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-50 sm:text-4xl lg:text-5xl">
            Turn your design notes into a case study draft.
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-400 sm:text-base">
            Paste your project notes, add screenshots, and get a structured draft you can edit and publish.
          </p>
        </section>

        <section className="mx-auto flex w-full max-w-3xl flex-col gap-6">
          <InputForm
            isLoading={isLoading}
            onGenerationStart={() => {
              setIsLoading(true);
              setError(null);
              setStreamText("");
              setDraft(null);
            }}
            onGenerationError={(message) => {
              setIsLoading(false);
              setError(message);
              setDraft(null);
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

