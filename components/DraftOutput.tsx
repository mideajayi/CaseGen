type DraftOutputProps = {
  draft?: string;
};

const DraftOutput = ({ draft }: DraftOutputProps) => {
  return (
    <section className="space-y-4 rounded-xl border border-slate-200 bg-slate-50/80 p-4 shadow-inner">
      <h2 className="text-lg font-semibold text-slate-900">
        Case study draft (placeholder)
      </h2>
      <p className="text-sm text-slate-600">
        This area will show the draft case study that CaseGen generates from
        your notes and screenshots.
      </p>
      <div className="rounded-lg border border-dashed border-slate-300 bg-white p-3 text-sm text-slate-700">
        {draft ?? "Draft content will appear here once generation is wired up."}
      </div>
    </section>
  );
};

export default DraftOutput;

