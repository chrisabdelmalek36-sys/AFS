// Global route-transition skeleton — shown while any page's data loads.
export default function Loading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="space-y-2">
        <div className="h-7 w-44 rounded-lg bg-slate-200" />
        <div className="h-4 w-72 rounded bg-slate-200/70" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-2xl border border-slate-200 bg-white p-4">
            <div className="h-3 w-20 rounded bg-slate-200" />
            <div className="mt-3 h-6 w-16 rounded bg-slate-200/80" />
          </div>
        ))}
      </div>
      <div className="h-72 rounded-2xl border border-slate-200 bg-white p-5">
        <div className="h-3 w-32 rounded bg-slate-200" />
        <div className="mt-4 space-y-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-4 rounded bg-slate-100" />
          ))}
        </div>
      </div>
    </div>
  );
}
