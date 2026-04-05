"use client";

import { useEffect, useState } from "react";
import type { ReactElement } from "react";

export type ExtractedMeta = {
  timeline: string;
  platform: string;
  team: string;
  tools: string;
  persona1: string;
  persona2: string;
  quote: string;
  constraints: string;
  outcomes: string;
};

type FieldKey = keyof ExtractedMeta;

const FIELD_LABELS: Record<FieldKey, string> = {
  timeline: "Timeline",
  platform: "Platform",
  team: "Team",
  tools: "Tools",
  persona1: "Persona 1",
  persona2: "Persona 2",
  quote: "Key quote",
  constraints: "Constraints",
  outcomes: "Outcomes",
};

const FIELD_HINTS: Partial<Record<FieldKey, string>> = {
  timeline: "Check this matches your notes exactly — numbers are often misread from handwriting.",
  platform: "Check if misread from handwriting or images.",
  persona1: "Check name and age match your notes exactly.",
  persona2: "Check name and age match your notes exactly.",
};

const NOT_SPECIFIED = "not specified";

const ALWAYS_REVIEW: FieldKey[] = ["timeline", "persona1", "persona2"];

const parseMeta = (raw: string): ExtractedMeta => {
  const get = (key: string): string => {
    const match = new RegExp(`${key}:\\s*([^|]+)`, "i").exec(raw);
    return match ? match[1].trim() : NOT_SPECIFIED;
  };
  return {
    timeline: get("Timeline"),
    platform: get("Platform"),
    team: get("Team"),
    tools: get("Tools"),
    persona1: get("Persona 1"),
    persona2: get("Persona 2"),
    quote: get("Quote"),
    constraints: get("Constraints"),
    outcomes: get("Outcomes"),
  };
};

const isFlagged = (value: string, key?: FieldKey): boolean => {
  const lower = value.toLowerCase();
  if (
    lower === NOT_SPECIFIED ||
    lower === "" ||
    lower.includes("website") ||
    lower.includes("web platform")
  )
    return true;
  if (key && ALWAYS_REVIEW.includes(key)) return true;
  return false;
};

type ReviewModalProps = {
  rawMeta: string;
  onConfirm: (corrected: ExtractedMeta) => void;
  onBack: () => void;
};

const ReviewModal = ({
  rawMeta,
  onConfirm,
  onBack,
}: ReviewModalProps): ReactElement => {
  const [fields, setFields] = useState<ExtractedMeta>(() =>
    parseMeta(rawMeta),
  );
  const [expanded, setExpanded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const [initialFlaggedKeys] = useState<FieldKey[]>(() =>
    (Object.keys(parseMeta(rawMeta)) as FieldKey[]).filter((k) =>
      isFlagged(parseMeta(rawMeta)[k], k),
    ),
  );
  const flaggedKeys = initialFlaggedKeys;
  const hasFlagged = initialFlaggedKeys.length > 0;

  const confirmedSummary = (Object.keys(fields) as FieldKey[])
    .filter((k) => !initialFlaggedKeys.includes(k))
    .map((k) => fields[k])
    .slice(0, 4)
    .join(" · ");

  const update = (key: FieldKey, value: string) => {
    setFields((prev) => ({ ...prev, [key]: value }));
  };

  const nonFlaggedKeys = (Object.keys(fields) as FieldKey[]).filter(
    (k) => !initialFlaggedKeys.includes(k),
  );

  const handleConfirm = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    onConfirm(fields);
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
  };

  const content = (
    <div
      className={
        isMobile
          ? "w-full rounded-t-2xl bg-white px-4 pb-6"
          : "relative w-full max-w-md rounded-2xl border border-[#f2f5fc] bg-white p-6 shadow-sm"
      }
      onClick={(e) => e.stopPropagation()}
    >
      {isMobile && (
        <div className="mx-auto mb-4 mt-3 h-1 w-9 rounded-full bg-[#e0e0e0]" />
      )}

      {!isMobile && (
        <button
          type="button"
          onClick={onBack}
          className="absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full bg-[#f2f5fc] text-xs text-[#9ca0ac] hover:bg-[#e8edf8]"
        >
          ✕
        </button>
      )}

      <p className="mb-0.5 text-xs text-[#9ca0ac]">Review extraction</p>
      <p className="text-base font-medium text-[#3f3f3f]">
        {hasFlagged
          ? `${flaggedKeys.length} thing${flaggedKeys.length > 1 ? "s" : ""} need your eye`
          : "Everything looks good"}
      </p>
      <p className="mb-4 mt-1 text-sm text-[#9ca0ac]">
        {hasFlagged
          ? "We pre-filled these from your notes — confirm or correct before generating."
          : "Hit generate or expand to double-check."}
      </p>

      {confirmedSummary && (
        <div className="mb-4 flex items-start justify-between gap-2 rounded-xl bg-[#fafafa] px-3 py-2.5">
          <p className="text-xs leading-relaxed text-[#9ca0ac]">
            <span className="font-medium text-[#3f3f3f]">Confirmed: </span>
            {confirmedSummary}
          </p>
          {nonFlaggedKeys.length > 0 && (
            <button
              type="button"
              onClick={() => setExpanded(!expanded)}
              className="shrink-0 text-xs text-[#c1c2c6] hover:text-[#9ca0ac]"
            >
              {expanded ? "hide" : "show all"}
            </button>
          )}
        </div>
      )}

      {expanded && (
        <div className="mb-4 grid grid-cols-2 gap-3">
          {nonFlaggedKeys.map((key) => (
            <div
              key={key}
              className={
                key === "team" || key === "quote" || key === "outcomes"
                  ? "col-span-2"
                  : ""
              }
            >
              <p className="mb-1 text-xs font-medium text-[#9ca0ac]">
                {FIELD_LABELS[key]}
              </p>
              <input
                type="text"
                value={fields[key]}
                onChange={(e) => update(key, e.target.value)}
                className="h-9 w-full rounded-lg border border-[#f2f5fc] bg-white px-3 text-sm text-[#3f3f3f] focus:outline-none focus:ring-2 focus:ring-[#082cd0]/20"
              />
            </div>
          ))}
        </div>
      )}

      {hasFlagged && (
        <div className="mb-4">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-amber-700">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />
            Confirm or fix {flaggedKeys.length === 1 ? "this field" : "these fields"}
          </p>
          <div className="flex flex-col gap-3">
            {flaggedKeys.map((key) => (
              <div key={key}>
                <p className="mb-1 text-xs font-medium text-[#9ca0ac]">
                  {FIELD_LABELS[key]}
                </p>
                <input
                  type="text"
                  value={fields[key] === NOT_SPECIFIED ? "" : fields[key]}
                  placeholder={`Enter ${FIELD_LABELS[key].toLowerCase()}`}
                  onChange={(e) => update(key, e.target.value)}
                  className="h-9 w-full rounded-lg border border-amber-300 bg-amber-50/40 px-3 text-sm text-[#3f3f3f] focus:outline-none focus:ring-2 focus:ring-amber-300/50"
                />
                {FIELD_HINTS[key] && (
                  <p className="mt-1 text-xs text-[#c1c2c6]">
                    {FIELD_HINTS[key]}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div
        className={`flex items-center ${isMobile ? "flex-col gap-3" : "justify-between"}`}
      >
        {!isMobile && (
          <button
            type="button"
            onClick={onBack}
            className="text-sm text-[#9ca0ac] hover:text-[#3f3f3f]"
          >
            ← Back
          </button>
        )}
        <button
          type="button"
          onClick={handleConfirm}
          className={`flex items-center justify-center gap-2 rounded-full bg-[#082cd0] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#061fa8] ${isMobile ? "w-full" : ""}`}
        >
          {hasFlagged ? "Looks good, generate" : "Generate case study"}
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </button>
        {isMobile && (
          <button
            type="button"
            onClick={onBack}
            className="text-sm text-[#9ca0ac]"
          >
            ← Back
          </button>
        )}
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-end bg-black/40"
        onClick={handleOverlayClick}
      >
        {content}
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={handleOverlayClick}
    >
      {content}
    </div>
  );
};

export default ReviewModal;