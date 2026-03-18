export type CaseStudyDraft = {
  problem: string;
  process: string;
  decisions: string;
  results: string;
};

type DraftOutputProps = {
  draft: CaseStudyDraft | null;
  isLoading: boolean;
  error: string | null;
};

const DraftOutput = ({ draft, isLoading, error }: DraftOutputProps) => {
  return (
    <section className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-950/80 p-5 shadow-lg shadow-black/40 ring-1 ring-zinc-900/60 backdrop-blur-sm sm:p-6">
      <header className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-zinc-400">
          Draft
        </h2>
        <p className="text-sm leading-relaxed text-zinc-200">
          Your structured draft will appear here. You can copy it and edit it in
          your own voice.
        </p>
      </header>

      {error && (
        <div className="rounded-xl border border-rose-900/60 bg-rose-950/40 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      )}

      {isLoading && (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-200">
          Generating your draft…
        </div>
      )}

      {!isLoading && !draft && !error && (
        <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-900/30 px-4 py-8 text-sm text-zinc-300">
          Draft content will appear here once you generate it.
        </div>
      )}

      {draft && (
        <div className="space-y-4">
          <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
              Problem
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-zinc-100">
              {draft.problem}
            </p>
          </section>
          <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
              Process
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-zinc-100">
              {draft.process}
            </p>
          </section>
          <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
              Decisions
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-zinc-100">
              {draft.decisions}
            </p>
          </section>
          <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-400">
              Results
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-zinc-100">
              {draft.results}
            </p>
          </section>
        </div>
      )}
    </section>
  );
};

export default DraftOutput;

