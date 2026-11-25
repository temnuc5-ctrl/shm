import { DOCUMENT_CATEGORIES } from "@/lib/documentCategories";
import { EMPTY_LIST_FILTERS, hasActiveFilters, type ListFilters } from "@/lib/listFilters";

const chipClass = (selected: boolean) =>
  `flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-black transition ${
    selected ? "border-transparent shm-gradient text-white" : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
  }`;

const inputClass = "w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 font-medium outline-none transition focus:border-primary focus:bg-white";

export default function ListFiltersBar({ value, onChange }: { value: ListFilters; onChange: (next: ListFilters) => void }) {
  const update = (patch: Partial<ListFilters>) => onChange({ ...value, ...patch });

  return (
    <section className="shm-card space-y-4">
      <input
        type="search"
        value={value.query}
        onChange={(event) => update({ query: event.target.value })}
        placeholder="بحث بالاسم أو التاريخ (مثال: 2026-11)"
        className={inputClass}
      />

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => update({ categoryCode: "all" })} className={chipClass(value.categoryCode === "all")}>
          الكل
        </button>
        {DOCUMENT_CATEGORIES.map((category) => (
          <button
            key={category.code}
            type="button"
            onClick={() => update({ categoryCode: category.code })}
            className={chipClass(value.categoryCode === category.code)}
          >
            <span className="h-3 w-3 rounded-full" style={{ backgroundColor: category.couleur }} />
            {category.nom_ar}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1">
          <span className="text-xs font-bold text-gray-500">من تاريخ</span>
          <input type="date" value={value.from} onChange={(event) => update({ from: event.target.value })} className={inputClass} />
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-bold text-gray-500">إلى تاريخ</span>
          <input type="date" value={value.to} onChange={(event) => update({ to: event.target.value })} className={inputClass} />
        </label>
      </div>

      {hasActiveFilters(value) && (
        <button type="button" onClick={() => onChange(EMPTY_LIST_FILTERS)} className="text-xs font-bold text-primary hover:underline">
          إعادة ضبط الفلاتر
        </button>
      )}
    </section>
  );
}
