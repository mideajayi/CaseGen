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
    <main className="relative min-h-screen overflow-y-auto bg-[#fafafa] px-4 py-12 text-[#3f3f3f] sm:py-16 lg:py-20">
      {/* Figma "Rectangle 1": subtle grid pattern over canvas */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.45]"
        aria-hidden
      >
        <div
          className="h-full w-full bg-[length:20px_20px] [background-image:radial-gradient(circle_at_center,_#d4d4d8_0.75px,_transparent_0.76px)]"
        />
      </div>

      <div className="relative mx-auto flex w-full max-w-[640px] flex-col gap-10 sm:gap-12 lg:gap-14">
        <section className="mx-auto flex w-full flex-col items-center gap-4 text-center">
          <div className="flex w-full flex-col gap-4">
            <h1 className="text-[2rem] font-bold leading-tight tracking-tight sm:text-5xl lg:text-[52px] lg:leading-[1.1]">
              <span className="text-[#3f3f3f]">Notes in.</span>{" "}
              <span className="text-[#082cd0]">Case study out.</span>
            </h1>
            <p className="mx-auto max-w-[32rem] text-base leading-relaxed text-[#9ca0ac] sm:text-lg">
              Stop staring at a blank page. Start with what you have.
            </p>
          </div>
        </section>

        <section className="mx-auto flex w-full max-w-[640px] flex-col gap-6">
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
