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
    <main className="relative min-h-screen overflow-y-auto bg-white px-4 py-12 text-neutral-950 sm:py-16 lg:py-20">
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden opacity-[0.04]"
        aria-hidden
      >
        <div className="absolute left-1/2 top-1/2 h-[min(120vw,720px)] w-[min(120vw,720px)] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_center,_#000_0%,_transparent_70%)]" />
      </div>

      <div className="relative mx-auto flex w-full max-w-3xl flex-col gap-10 sm:gap-12 lg:gap-14">
        <section className="mx-auto w-full max-w-2xl text-center">
          <h1 className="text-4xl font-bold tracking-tight text-neutral-950 sm:text-5xl lg:text-6xl">
            Notes in. Case study out.
          </h1>
          <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-neutral-500 sm:text-lg">
            Stop staring at a blank page. Start with what you have.
          </p>
        </section>

        <section className="mx-auto flex w-full max-w-2xl flex-col gap-6">
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
