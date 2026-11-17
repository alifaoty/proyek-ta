export default function SegmentedTabs({ tabs, value, onChange }) {
  return (
    <div className="inline-flex items-center gap-1 bg-slate-100 p-1 rounded-lg overflow-x-auto max-w-full no-scrollbar">
      {tabs.map((t) => {
        const active = value === t.key;
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => onChange(t.key)}
            className={`h-7 px-3 rounded-md text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
              active
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}
