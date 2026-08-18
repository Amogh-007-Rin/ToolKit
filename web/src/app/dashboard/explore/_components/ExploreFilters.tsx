import { EXPLORE_FILTERS, type ExploreFilter } from "./types";

export default function ExploreFilters({
  activeFilter,
  onChange,
}: {
  activeFilter: ExploreFilter;
  onChange: (filter: ExploreFilter) => void;
}) {
  return (
    <div>
      <p className="mb-3 text-[14px] font-semibold tracking-wide">Trending ToolKit Creators</p>
      <div className="scrollbar-none flex max-w-full gap-2 overflow-x-auto pb-1">
        {EXPLORE_FILTERS.map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => onChange(filter)}
            className={`shrink-0 rounded-md border px-4 py-2 text-[11px] font-medium transition-colors ${
              activeFilter === filter
                ? "border-foreground bg-foreground text-background"
                : "border-border bg-card text-muted-foreground hover:border-foreground/40 hover:text-foreground"
            }`}
          >
            {filter}
          </button>
        ))}
      </div>
    </div>
  );
}
