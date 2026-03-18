"use client";

import { useState, ChangeEvent, MouseEvent } from "react";
import type { ReactElement } from "react";

import type { CaseStudyDraft } from "@/components/DraftOutput";

type SelectedImage = {
  file: File;
  previewUrl: string;
};

type GenerateResponseBody =
  | { success: true; draft: CaseStudyDraft }
  | { error: string };

type InputFormProps = {
  onDraftGenerated: (draft: CaseStudyDraft) => void;
  onGenerationStart: () => void;
  onGenerationError: (message: string) => void;
  isLoading: boolean;
};

// Renders the main input form where designers paste notes, add screenshots, and trigger draft generation.
const InputForm = ({
  onDraftGenerated,
  onGenerationStart,
  onGenerationError,
  isLoading,
}: InputFormProps): ReactElement => {
  const [notes, setNotes] = useState<string>("");
  const [images, setImages] = useState<SelectedImage[]>([]);
  const [imageWarning, setImageWarning] = useState<string | null>(null);

  const handleNotesChange = (event: ChangeEvent<HTMLTextAreaElement>): void => {
    setNotes(event.target.value);
  };

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const files = event.target.files;

    if (!files) {
      setImages([]);
      setImageWarning(null);
      return;
    }

    const fileArray = Array.from(files);
    const limitedFiles = fileArray.slice(0, 5);

    const tooManyFilesSelected = fileArray.length > 5;
    setImageWarning(
      tooManyFilesSelected
        ? "You can upload up to 5 images. Only the first 5 were selected."
        : null,
    );

    const mapped: SelectedImage[] = limitedFiles.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }));

    setImages(mapped);
  };

  const handleGenerateClick = (event: MouseEvent<HTMLButtonElement>): void => {
    event.preventDefault();

    void (async () => {
      try {
        onGenerationStart();

        const response = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            notes,
            images: [],
          }),
        });

        const data = (await response.json()) as GenerateResponseBody;

        if (!response.ok) {
          const message =
            "error" in data ? data.error : "Something went wrong.";
          onGenerationError(message);
          return;
        }

        if ("success" in data && data.success) {
          onDraftGenerated(data.draft);
          return;
        }

        onGenerationError("Unexpected response from the server.");
      } catch {
        onGenerationError("Network error. Please try again.");
      }
    })();
  };

  const isGenerateDisabled = notes.trim().length === 0;

  return (
    <section className="flex flex-col gap-5 rounded-2xl border border-zinc-800 bg-zinc-950/80 p-5 shadow-lg shadow-black/40 ring-1 ring-zinc-900/60 backdrop-blur-sm sm:p-6">
      <header className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-400">
          Inputs
        </h2>
        <p className="text-sm leading-relaxed text-zinc-200">
          Paste your project notes below. Add screenshots if you have them.
          CaseGen will generate a structured case study draft you can copy and
          edit.
        </p>
      </header>

      <div className="space-y-4">
        <label className="block space-y-2">
          <span className="text-xs font-medium uppercase tracking-[0.18em] text-zinc-400">
            Project notes
          </span>
          <textarea
            value={notes}
            onChange={handleNotesChange}
            rows={8}
            className="w-full min-h-[160px] rounded-xl border border-zinc-800 bg-zinc-900/80 px-4 py-3 text-sm text-zinc-50 shadow-inner outline-none ring-0 transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-950/80 sm:min-h-[200px] sm:text-base"
            placeholder="Paste anything relevant to your project: the brief, your design decisions, what you tested, user feedback, before/after metrics, what worked and what didn't. The more specific you are, the better the draft."
          />
          <p className="text-xs text-zinc-500">
            Minimum of a few sentences works best; the more specific the better.
          </p>
        </label>

        <div className="space-y-3">
          <p className="flex items-center justify-between gap-2 text-xs font-medium uppercase tracking-[0.18em] text-zinc-400">
            <span>Add screenshots (optional — up to 5 images)</span>
          </p>

          <div className="flex flex-col gap-3 rounded-xl border border-dashed border-zinc-800 bg-zinc-900/50 p-4">
            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex cursor-pointer items-center justify-center rounded-full bg-zinc-100 px-4 py-2 text-xs font-medium text-zinc-900 shadow-sm transition hover:bg-zinc-200">
                <span>Choose images</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="hidden"
                  onChange={handleImageChange}
                />
              </label>
              <span className="text-xs text-zinc-500">
                JPG, PNG, or WebP — we&apos;ll only use them to inform the
                draft.
              </span>
            </div>

            {imageWarning && (
              <p className="text-xs font-medium text-amber-400">
                {imageWarning}
              </p>
            )}

            {images.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-zinc-300">
                  {images.length} image{images.length === 1 ? "" : "s"} selected
                </p>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {images.map((image) => (
                    <figure
                      key={image.file.name + image.file.lastModified}
                      className="group relative overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/80"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={image.previewUrl}
                        alt={image.file.name}
                        className="h-20 w-full object-cover opacity-90 transition group-hover:opacity-100 sm:h-24"
                      />
                      <figcaption className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-1.5 pb-1.5 pt-4">
                        <p className="truncate text-[10px] text-zinc-100">
                          {image.file.name}
                        </p>
                      </figcaption>
                    </figure>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={handleGenerateClick}
          disabled={isGenerateDisabled || isLoading}
          className="mt-2 inline-flex h-[52px] w-full items-center justify-center rounded-full bg-indigo-600 px-6 text-sm font-semibold text-white shadow-lg shadow-indigo-900/40 transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? "Generating…" : "Generate case study draft"}
        </button>
      </div>
    </section>
  );
};

export default InputForm;

