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
  onStreamTextUpdate: (text: string) => void;
  isLoading: boolean;
};

// Converts an uploaded image file into a base64 data URL so it can be sent to the API.
const fileToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Failed to read image file."));
    reader.readAsDataURL(file);
  });
};

// Resizes and compresses an image file in the browser, then returns a base64 data URL.
const fileToCompressedDataUrl = async (file: File): Promise<string> => {
  const maxDimension = 1200;
  const quality = 0.82;

  try {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.decoding = "async";

    const loaded = new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Failed to load image for processing."));
    });

    image.src = objectUrl;
    await loaded;
    URL.revokeObjectURL(objectUrl);

    const originalWidth = image.naturalWidth || image.width;
    const originalHeight = image.naturalHeight || image.height;
    if (!originalWidth || !originalHeight) {
      return fileToDataUrl(file);
    }

    const scale = Math.min(
      1,
      maxDimension / Math.max(originalWidth, originalHeight),
    );

    const targetWidth = Math.max(1, Math.round(originalWidth * scale));
    const targetHeight = Math.max(1, Math.round(originalHeight * scale));

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const context = canvas.getContext("2d");
    if (!context) {
      return fileToDataUrl(file);
    }

    context.drawImage(image, 0, 0, targetWidth, targetHeight);

    // Convert to JPEG to reduce payload size versus PNG for screenshots.
    return canvas.toDataURL("image/jpeg", quality);
  } catch {
    // If compression fails for any reason, fall back to the original base64.
    return fileToDataUrl(file);
  }
};

// Renders the main input form where designers paste notes, add screenshots, and trigger draft generation.
const InputForm = ({
  onDraftGenerated,
  onGenerationStart,
  onGenerationError,
  onStreamTextUpdate,
  isLoading,
}: InputFormProps): ReactElement => {
  const [notes, setNotes] = useState<string>("");
  const [images, setImages] = useState<SelectedImage[]>([]);
  const [imageWarning, setImageWarning] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleNotesChange = (event: ChangeEvent<HTMLTextAreaElement>): void => {
    setNotes(event.target.value);
    if (validationError) {
      setValidationError(null);
    }
  };

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const files = event.target.files;

    if (!files) {
      return;
    }

    const fileArray = Array.from(files);
    const newMapped: SelectedImage[] = fileArray.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }));

    // Append new images to existing ones, but limit to 5 total
    setImages((prevImages) => {
      const combined = [...prevImages, ...newMapped];
      const limited = combined.slice(0, 5);

      // Show warning if user tried to upload more than space allows
      const totalAttempted = prevImages.length + fileArray.length;
      if (totalAttempted > 5) {
        setImageWarning(
          `You can upload up to 5 images total. ${limited.length} image${limited.length === 1 ? "" : "s"} are selected.`,
        );
      } else {
        setImageWarning(null);
      }

      return limited;
    });
  };

  const handleRemoveImage = (index: number): void => {
    setImages((prevImages) => {
      const newImages = [...prevImages];
      URL.revokeObjectURL(newImages[index].previewUrl);
      newImages.splice(index, 1);
      return newImages;
    });
  };

  const handleGenerateClick = (event: MouseEvent<HTMLButtonElement>): void => {
    event.preventDefault();

    if (notes.trim().length === 0) {
      setValidationError("Please add your project notes before generating.");
      return;
    }

    void (async () => {
      try {
        setValidationError(null);
        onGenerationStart();
        onStreamTextUpdate("");

        const imageDataUrls: string[] = await Promise.all(
          images.map(async (selected) => fileToCompressedDataUrl(selected.file)),
        );

        const response = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            notes,
            images: imageDataUrls,
          }),
        });

        if (!response.ok) {
          const data = (await response.json()) as GenerateResponseBody;
          const message =
            "error" in data ? data.error : "Something went wrong.";
          onGenerationError(message);
          return;
        }

        if (!response.body) {
          onGenerationError("No response body received.");
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let fullJsonText = "";

        // Reads the server-sent events stream and updates the UI as JSON is generated.
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

            const lines = rawEvent
              .split("\n")
              .map((line) => line.trim())
              .filter(Boolean);

            const eventLine = lines.find((line) => line.startsWith("event:"));
            const dataLine = lines.find((line) => line.startsWith("data:"));
            if (!dataLine) continue;

            const eventType = eventLine
              ? eventLine.replace(/^event:\s*/, "")
              : "message";
            const data = dataLine.replace(/^data:\s*/, "");

            if (data === "[DONE]") continue;

            if (eventType === "delta") {
              const deltaText = JSON.parse(data) as string;
              fullJsonText += deltaText;
              onStreamTextUpdate(fullJsonText);
            } else if (eventType === "done") {
              const parsed = JSON.parse(data) as unknown;
              if (
                !parsed ||
                typeof parsed !== "object" ||
                !("problem" in parsed) ||
                !("process" in parsed) ||
                !("solution" in parsed) ||
                !("feedback" in parsed) ||
                !("learnings" in parsed)
              ) {
                onGenerationError(
                  "Server returned JSON with an unexpected shape.",
                );
                return;
              }

              onDraftGenerated(parsed as CaseStudyDraft);
              onStreamTextUpdate("");
              return;
            } else if (eventType === "error") {
              const message = JSON.parse(data) as string;
              onGenerationError(message);
              return;
            }
          }
        }
      } catch {
        onGenerationError("Network error. Please try again.");
      }
    })();
  };

  return (
    <section className="flex w-full flex-col gap-4">
      {/* Figma "Input Card": white, 16px radius, hairline border */}
      <div className="rounded-2xl border border-[#f2f5fc] bg-white p-4 sm:p-4">
        <label className="block">
          <span className="sr-only">Project notes</span>
          <textarea
            value={notes}
            onChange={handleNotesChange}
            rows={6}
            className="w-full min-h-[80px] resize-none border-0 bg-transparent p-0 text-base leading-relaxed text-[#3f3f3f] placeholder:text-[#c1c2c6] focus:outline-none focus:ring-0 sm:min-h-[80px]"
            placeholder="Describe your project: brief, decisions, tests, feedback, metrics…"
          />
        </label>

        <div
          className="my-4 h-px w-full bg-[#f2f5fc]"
          aria-hidden
        />

        <div className="flex min-h-9 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 sm:gap-2">
            <div className="group relative flex shrink-0 items-center">
              <label
                className="relative inline-flex h-9 min-h-[36px] cursor-pointer items-center justify-center gap-1 rounded-full bg-[#f2f5fc] px-3 py-2 text-sm font-medium text-[#636678] transition hover:bg-[#e8edf8] focus-within:ring-2 focus-within:ring-[#082cd0]/25 focus-within:ring-offset-2 focus-within:ring-offset-white"
                title="Optional · JPG, PNG, WebP"
              >
                <svg
                  className="h-4 w-4 shrink-0 text-[#636678]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                </svg>
                <span>Attach</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  onChange={(event) => {
                    handleImageChange(event);
                    const target = event.target as HTMLInputElement;
                    target.value = "";
                  }}
                />
              </label>
              <span
                className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-max max-w-[min(100vw-2rem,16rem)] -translate-x-1/2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-center text-xs leading-snug text-neutral-700 opacity-0 shadow-md transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100 sm:left-0 sm:translate-x-0"
                role="tooltip"
              >
                Optional · JPG, PNG, WebP
              </span>
            </div>

            <span className="shrink-0 text-sm tabular-nums text-[#a0a5b5]">
              {images.length}/5
            </span>

            {images.length > 0 && (
              <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto pb-0.5 [scrollbar-width:thin]">
                {images.map((image, index) => (
                  <figure
                    key={image.file.name + image.file.lastModified}
                    className="group/thumb relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-[#eeeeee] bg-neutral-100 sm:h-14 sm:w-14"
                    title={image.file.name}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={image.previewUrl}
                      alt={image.file.name}
                      className="h-full w-full object-cover"
                    />
                    <figcaption className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-1 pb-1 pt-3">
                      <p className="truncate text-[8px] leading-tight text-white sm:text-[9px]">
                        {image.file.name}
                      </p>
                    </figcaption>
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(index)}
                      className="absolute right-0.5 top-0.5 flex h-6 w-6 items-center justify-center rounded-full bg-white/95 text-[#3f3f3f] shadow-sm ring-1 ring-black/10 transition hover:bg-white"
                      title="Remove image"
                    >
                      <span className="text-sm font-semibold leading-none">
                        ×
                      </span>
                    </button>
                  </figure>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleGenerateClick}
            disabled={isLoading}
            className="inline-flex h-9 min-h-[36px] w-9 shrink-0 items-center justify-center self-end rounded-full bg-[#082cd0] text-white shadow-sm transition hover:bg-[#061fa8] disabled:cursor-not-allowed disabled:opacity-50 sm:self-auto"
            aria-label={
              isLoading ? "Generating draft" : "Generate case study draft"
            }
          >
            {isLoading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {validationError && (
        <p className="text-sm font-medium text-red-600">{validationError}</p>
      )}

      {imageWarning && (
        <p className="text-center text-sm font-medium text-amber-700">
          {imageWarning}
        </p>
      )}
    </section>
  );
};

export default InputForm;

