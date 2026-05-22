import fs from "node:fs";
import path from "node:path";

export type KbDoc = {
  filename: string;
  title: string;
  contents: string;
};

let cached: string | null = null;

function loadDocs(): KbDoc[] {
  const dir = path.join(process.cwd(), "knowledge-base");
  const entries = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .sort();

  return entries.map((filename) => {
    const contents = fs.readFileSync(path.join(dir, filename), "utf8");
    const firstLine = contents.split("\n", 1)[0] ?? filename;
    const title = firstLine.replace(/^#\s*/, "").trim() || filename;
    return { filename, title, contents };
  });
}

export function buildKnowledgeBaseBlock(): string {
  if (cached !== null) return cached;

  const docs = loadDocs();
  const header = [
    "SMC OPERATIONAL KNOWLEDGE BASE",
    "",
    "The following documents are the authoritative source of truth for this assistant.",
    "When citing, use the exact document title as it appears in the heading.",
    "",
    `Documents available (${docs.length}):`,
    ...docs.map((d, i) => `  ${i + 1}. ${d.title}`),
    "",
    "================================================================",
    "",
  ].join("\n");

  const body = docs
    .map(
      (d) =>
        [
          `--- BEGIN DOCUMENT: ${d.title} ---`,
          `Source file: ${d.filename}`,
          "",
          d.contents.trim(),
          "",
          `--- END DOCUMENT: ${d.title} ---`,
        ].join("\n"),
    )
    .join("\n\n");

  cached = header + body;
  return cached;
}
