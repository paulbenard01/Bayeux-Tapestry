export interface Content {
  scenes: unknown[];
  stories: unknown[];
  hotspots: unknown[];
  sources: Record<string, unknown>;
  layer: unknown;
}
export function loadContent(root: string): Content;
export function reviewReport(content: Content): string;
