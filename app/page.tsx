"use client";

import InputForm from "@/components/InputForm";
import DraftOutput from "@/components/DraftOutput";
import ReviewModal from "@/components/ReviewModal";
import type { ExtractedMeta } from "@/components/ReviewModal";

import { useEffect, useRef, useState } from "react";
import type { CaseStudyDraft } from "@/components/DraftOutput";

const metaToString = (meta: ExtractedMeta): string =>
  [
    `Timeline: ${meta.timeline}`,
    `Platform: ${meta.platform}`,
    `Team: ${meta.team}`,
    `Tools: ${meta.tools}`,
    `Persona 1: ${meta.persona1}`,
    `Persona 2: ${meta.persona2}`,
    `Quote: ${meta.quote}`,
    `Constraints: ${meta.constraints}`,
    `Outcomes: ${meta.outcomes}`,
  ].join(" | ");

export default function Home() {
  const [draft, setDraft] = useState<CaseStudyDraft | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [streamText, setStreamText] = useState<string>("");

  const [pendingNotes, setPendingNotes] = useState<string>("");
  const [pendingImages, setPendingImages] = useState<string[]>([]);
  const [rawMeta, setRawMeta] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState<boolean>(false);

  // Ref to track active reader so we can cancel it on reset
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);

  useEffect(() => {
    if (!draft) return;
    const target = document.getElementById("draft-output");
    if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [draft]);

  const handleExtract = async (notes: string, imageDataUrls: string[]) => {
    setPendingNotes(notes);
    setPendingImages(imageDataUrls);
    setIsExtracting(true);

    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes, images: imageDataUrls }),
      });

      if (!res.ok) {
        void handleGenerate(notes, imageDataUrls, undefined);
        return;
      }

      const data = (await res.json()) as { meta?: string; error?: string };
      if (data.meta) {
        setRawMeta(data.meta);
      } else {
        void handleGenerate(notes, imageDataUrls, undefined);
      }
    } catch {
      void handleGenerate(notes, imageDataUrls, undefined);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleGenerate = async (
    notes: string,
    imageDataUrls: string[],
    correctedMeta: ExtractedMeta | undefined,
  ) => {
    setRawMeta(null);
    setIsLoading(true);
    setError(null);
    setStreamText("");
    setDraft(null);

    const correctedMetaString = correctedMeta
      ? metaToString(correctedMeta)
      : undefined;

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notes,
          images: imageDataUrls,
          correctedMeta: correctedMetaString,
        }),
      });

      if (!response.ok || !response.body) {
        setIsLoading(false);
        setError("Something went wrong. Please try again.");
        return;
      }

      const reader = response.body.getReader();
      readerRef.current = reader;
      const decoder = new TextDecoder();
      let buffer = "";
      let fullJsonText = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (!value) continue;

        buffer += decoder.decode(value, { stream: true });

        while (true) {
          const eventEndIndex = buffer.indexOf("\n\n");
          if (eventEndIndex === -1) break;

          const rawEvent = buffer.slice(0, eventEndIndex);
          buffer = buffer.slice(eventEndIndex + 2);

          const lines = rawEvent.split("\n").map((l) => l.trim()).filter(Boolean);

          // Skip SSE comment lines (heartbeat pings start with ":")
          if (lines.every((l) => l.startsWith(":"))) continue;

          const eventLine = lines.find((l) => l.startsWith("event:"));
          const dataLine = lines.find((l) => l.startsWith("data:"));
          if (!dataLine) continue;

          const eventType = eventLine
            ? eventLine.replace(/^event:\s*/, "")
            : "message";
          const data = dataLine.replace(/^data:\s*/, "");
          if (data === "[DONE]") continue;

          if (eventType === "delta") {
            const deltaText = JSON.parse(data) as string;
            fullJsonText += deltaText;
            setStreamText(fullJsonText);
          } else if (eventType === "done") {
            const parsed = JSON.parse(data) as CaseStudyDraft;
            setIsLoading(false);
            setDraft(parsed);
            setStreamText("");
            readerRef.current = null;
            return;
          } else if (eventType === "error") {
            const message = JSON.parse(data) as string;
            setIsLoading(false);
            setError(message);
            readerRef.current = null;
            return;
          }
        }
      }
    } catch (err) {
      // Ignore abort errors from reader cancellation on reset
      if (err instanceof Error && err.name === "AbortError") return;
      setIsLoading(false);
      setError("Network error. Please try again.");
    }
  };

  const handleReset = () => {
    if (readerRef.current) {
      void readerRef.current.cancel();
      readerRef.current = null;
    }
    setIsLoading(false);
    setError(null);
    setDraft(null);
    setStreamText("");
  };

  return (
    <main className="relative min-h-screen overflow-y-auto bg-[#fafafa] px-4 py-12 text-[#3f3f3f] sm:py-16 lg:py-20">
      <div className="pointer-events-none absolute inset-0 opacity-100" aria-hidden>
        <div className="h-full w-full bg-[length:20px_20px] [background-image:radial-gradient(circle_at_center,_#d4d4d8_0.75px,_transparent_0.76px)]" />
      </div>

      <div className="relative mx-auto flex w-full max-w-[640px] flex-col gap-10 sm:gap-12 lg:gap-14">
        <section className="mx-auto flex w-full flex-col items-center gap-2 text-center sm:gap-2">
          <div className="flex w-full flex-col gap-2 sm:gap-2">
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
            isLoading={isLoading || isExtracting}
            onExtractAndReview={handleExtract}
            onGenerationStart={() => {}}
            onGenerationError={(message) => {
              setIsLoading(false);
              setError(message);
            }}
            onDraftGenerated={(newDraft) => {
              setIsLoading(false);
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
            onReset={handleReset}
          />
        </section>
      </div>

      {rawMeta && (
        <ReviewModal
          rawMeta={rawMeta}
          onConfirm={(corrected) =>
            void handleGenerate(pendingNotes, pendingImages, corrected)
          }
          onBack={() => setRawMeta(null)}
        />
      )}
    </main>
  );
}