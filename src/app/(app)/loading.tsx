// Mostrado na hora em que se clica em outro menu, enquanto o servidor monta a página.
export default function Loading() {
  return (
    <div className="mx-auto max-w-[1500px] animate-pulse space-y-5" aria-busy="true" aria-label="Carregando">
      <div className="space-y-3">
        <div className="h-3 w-48 rounded-full bg-brand-100" />
        <div className="h-8 w-80 rounded-lg bg-slate-200" />
        <div className="h-4 w-[min(36rem,90%)] rounded-full bg-slate-100" />
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-28 rounded-2xl border border-slate-200 bg-white p-4 shadow-soft">
            <div className="h-4 w-4 rounded bg-brand-100" />
            <div className="mt-3 h-7 w-20 rounded bg-slate-200" />
            <div className="mt-2 h-3 w-28 rounded-full bg-slate-100" />
          </div>
        ))}
      </div>
      <div className="h-14 rounded-xl border border-slate-200 bg-white" />
      <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-4">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex items-center gap-4 py-2">
            <div className="h-4 w-1/3 rounded-full bg-slate-200" />
            <div className="h-4 w-1/5 rounded-full bg-slate-100" />
            <div className="ml-auto h-4 w-16 rounded-full bg-slate-100" />
          </div>
        ))}
      </div>
    </div>
  );
}
