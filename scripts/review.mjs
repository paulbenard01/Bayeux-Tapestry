import { writeFileSync } from "node:fs";
import { loadContent, reviewReport } from "./review-report.mjs";

writeFileSync("docs/review.md", reviewReport(loadContent(".")));
console.log("docs/review.md written");
