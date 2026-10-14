export interface Content {
  scenes: unknown[];
  notes: unknown[];
  slides: unknown[];
  sources: Record<string, unknown>;
  layers: unknown[];
}
export function loadContent(root: string): Content;
export function reviewReport(content: Content): string;
