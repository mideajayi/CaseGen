const InputForm = () => {
  return (
    <section className="space-y-4 rounded-xl border border-dashed border-slate-300 bg-white/60 p-4 shadow-sm backdrop-blur">
      <h2 className="text-lg font-semibold text-slate-900">
        Case study inputs (placeholder)
      </h2>
      <p className="text-sm text-slate-600">
        Here you will be able to paste project notes and upload screenshots. For
        now, this is just a placeholder section.
      </p>
      <div className="space-y-3">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-800">
            Project notes
          </span>
          <textarea
            className="mt-1 w-full min-h-[120px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none ring-0 transition focus:border-sky-500 focus:ring-2 focus:ring-sky-100"
            placeholder="Describe the project, your role, goals, process, and outcomes..."
            disabled
          />
        </label>
        <div className="space-y-2">
          <span className="block text-sm font-medium text-slate-800">
            Screenshots
          </span>
          <input
            type="file"
            multiple
            disabled
            className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-full file:border-0 file:bg-slate-900 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          />
        </div>
        <button
          type="button"
          disabled
          className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Generate draft (coming soon)
        </button>
      </div>
    </section>
  );
};

export default InputForm;

