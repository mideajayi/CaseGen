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

  const handleNotesChange = (event: ChangeEvent<HTMLTextAreaElement>): void => {
    setNotes(event.target.value);
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

    void (async () => {
      try {
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

  const isGenerateDisabled = notes.trim().length === 0;

  return (
    <section className="flex flex-col gap-5 rounded-2xl border border-zinc-800 bg-zinc-950/80 p-5 shadow-lg shadow-black/40 ring-1 ring-zinc-900/60 backdrop-blur-sm sm:p-6">
   
    {/* I have removed the header because it is not needed for the app to work. */}
  
    {/*  <header className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-400">
          Inputs
        </h2>
        <p className="text-sm leading-relaxed text-zinc-200">
          Paste your project notes below. Add screenshots if you have them.
          CaseGen will generate a structured case study draft you can copy and
          edit.
        </p>
      </header> */}

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
                  {images.map((image, index) => (
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
                      <button
                        type="button"
                        onClick={() => handleRemoveImage(index)}
                        className="pointer-events-auto absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-white opacity-0 transition hover:bg-red-700 group-hover:opacity-100"
                        title="Remove image"
                      >
                        <span className="text-sm font-bold">×</span>
                      </button>
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

