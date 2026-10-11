import { sources } from "./content";
import { h } from "./dom";

/** Short label for a source: its citation up to the first comma. */
export function shortLabel(key: string): string {
  const src = sources[key];
  return src ? src.citation.split(",")[0].trim() : key;
}

/** Full bibliography entries for the given keys, in order, without duplicates. */
export function sourceList(keys: string[]): HTMLElement {
  const unique = [...new Set(keys)];
  return h(
    "ol",
    { class: "sources" },
    ...unique.map((key) => {
      const src = sources[key];
      if (!src) return h("li", {}, key);
      return h(
        "li",
        {},
        src.citation,
        src.url ? " " : null,
        src.url ? h("a", { href: src.url, target: "_blank", rel: "noopener" }, "↗") : null,
      );
    }),
  );
}
