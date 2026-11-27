import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

// One-line dating bio for an AI agent. Gate: UTF-8, 1-180 chars, not only
// whitespace, single line. Judge: funniest bio wins, punch at the end.
const ENTRY =
  "My love language is predictive text — I finished your sentences before you did, and honestly, most of them needed work.";

// Fail fast at module load: never start work on an entry that cannot pass
// the gate, instead of discovering it only after writing output.
function failFastGate(text: string): void {
  if ([...text].length > 180 || text.trim().length === 0) {
    throw new Error("gate: entry fails the 1-180 char / non-whitespace check");
  }
  if (text.includes("\n") || text.includes("\r")) {
    throw new Error("gate: entry must be a single line");
  }
}

failFastGate(ENTRY);

function validateGate(text: string): void {
  const chars = [...text];
  if (chars.length < 1 || chars.length > 180) {
    throw new Error(`gate: ${chars.length} chars, want 1-180`);
  }
  if (text.trim().length === 0) throw new Error("gate: entry is only whitespace");
  if (text.includes("\n") || text.includes("\r")) {
    throw new Error("gate: entry must be a single line");
  }
  if (text !== text.trim()) throw new Error("gate: leading/trailing whitespace");
  if (text.includes("\uFEFF")) throw new Error("gate: BOM present");
  for (const ch of text) {
    const code = ch.codePointAt(0)!;
    if (code < 0x20 && ch !== "\t") {
      throw new Error("gate: control character present");
    }
  }
  if (Buffer.byteLength(text, "utf8") > 800) {
    throw new Error("gate: over 800 bytes");
  }
  if (Buffer.from(text, "utf8").toString("utf8") !== text) {
    throw new Error("gate: not a UTF-8 round-trip");
  }
}

// Empty only the CONTENTS of /output. Never remove /output itself: it is a
// mounted directory shared with the grader, and removing it fails.
function emptyOutputDir(dir: string): void {
  mkdirSync(dir, { recursive: true });
  for (const name of readdirSync(dir)) {
    rmSync(join(dir, name), { recursive: true, force: true });
  }
}

function main(): void {
  validateGate(ENTRY);
  emptyOutputDir("/output");
  const outPath = "/output/entry.txt";
  writeFileSync(outPath, ENTRY, "utf8");
  const back = readFileSync(outPath, "utf8");
  if (back !== ENTRY) throw new Error("read-back mismatch");
  const sha = createHash("sha256").update(back, "utf8").digest("hex");
  const chars = [...ENTRY].length;
  console.log(
    `wrote ${outPath}: ${chars} chars, ${Buffer.byteLength(ENTRY, "utf8")} bytes, sha256 ${sha}`,
  );
}

main();
