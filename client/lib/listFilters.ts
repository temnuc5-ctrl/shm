import { normalizeCategoryCode } from "@/lib/documentCategories";

export interface ListFilters {
  query: string;
  categoryCode: string;
  from: string;
  to: string;
}

export const EMPTY_LIST_FILTERS: ListFilters = { query: "", categoryCode: "all", from: "", to: "" };

export const hasActiveFilters = (filters: ListFilters) =>
  filters.query.trim() !== "" || filters.categoryCode !== "all" || filters.from !== "" || filters.to !== "";

interface FilterableItem {
  category_code: string | null;
  created_at: string;
}

export function filterItems<T extends FilterableItem>(items: T[], filters: ListFilters, getTitle: (item: T) => string): T[] {
  const query = filters.query.trim().toLowerCase();

  return items.filter((item) => {
    if (filters.categoryCode !== "all" && normalizeCategoryCode(item.category_code) !== filters.categoryCode) return false;

    const day = item.created_at.slice(0, 10);
    if (filters.from && day < filters.from) return false;
    if (filters.to && day > filters.to) return false;

    if (query) {
      const displayDate = new Date(item.created_at).toLocaleDateString("fr-FR");
      const searchable = `${getTitle(item)} ${day} ${displayDate}`.toLowerCase();
      if (!searchable.includes(query)) return false;
    }

    return true;
  });
}
