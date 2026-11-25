/**
 * Uploads the pictures that paper files refer to (`[image: file|width|height]`, from Word books saved as HTML)
 * to the portal's private picture store, and rewrites each reference as `{{img:ID|width|height}}`, which the
 * portal shows inline to signed-in users.
 *
 * Usage: npx tsx scripts/pasco/upload-pictures.ts [private/papers/ready]
 *
 * Each distinct picture (by content) is uploaded once. The ids are remembered in private/papers/pictures.json,
 * so running this again only uploads new pictures. Run it after select-papers.ts and before prep:import.
 * Target: the Google Sheet's Drive folder when PREP_GAS_URL is set, otherwise the local demo store.
 */
import { createHash } from "node:crypto";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { config } from "dotenv";
import { storeFromEnv } from "../../src/lib/prep/store";

config({ path: ".env.local", quiet: true });

const dir = process.argv[2] ?? "private/papers/ready";
const HTML_DIR = "private/pasco/html";
const MAP_FILE = "private/papers/pictures.json";
const PARALLEL = 6;
const TOKEN = /\[image: ([^|\]]+)(?:\|(\d+)\|(\d+))?\]/g;
const MIME: Record<string, string> = { ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif", ".webp": "image/webp" };

/** sha1 of the picture -> its id in the store. Keyed by target so a demo store and the real one don't mix. */
type PictureMap = Record<string, Record<string, string>>;

async function main() {
  const store = storeFromEnv({ cache: false });
  const target = process.env.PREP_GAS_URL ? "sheet" : "local";
  const map: PictureMap = existsSync(MAP_FILE) ? JSON.parse(readFileSync(MAP_FILE, "utf8")) : {};
  const ids = (map[target] ??= {});
  const save = () => writeFileSync(MAP_FILE, JSON.stringify(map, null, 1) + "\n");

  // Every picture referenced, by file, with its content hash.
  const files = readdirSync(dir).filter((f) => f.endsWith(".json"));
  const pictures = new Map<string, { hash: string; data: Buffer; mimeType: string }>();
  for (const f of files) {
    for (const m of readFileSync(path.join(dir, f), "utf8").matchAll(TOKEN)) {
      if (pictures.has(m[1])) continue;
      const file = path.join(HTML_DIR, m[1]);
      const mimeType = MIME[path.extname(file).toLowerCase()];
      if (!existsSync(file) || !mimeType) throw new Error(`Picture not found or not a picture: ${file}`);
      const data = readFileSync(file);
      pictures.set(m[1], { hash: createHash("sha1").update(data).digest("hex"), data, mimeType });
    }
  }

  // Upload the ones the store doesn't have yet, a few at a time.
  const todo = [...new Map([...pictures.values()].filter((p) => !ids[p.hash]).map((p) => [p.hash, p])).values()];
  console.log(`${pictures.size} pictures referenced, ${todo.length} to upload (${target}).`);
  let done = 0;
  let failed = 0;
  const queue = [...todo];
  await Promise.all(
    Array.from({ length: PARALLEL }, async () => {
      for (let p = queue.shift(); p; p = queue.shift()) {
        for (let attempt = 1; ; attempt++) {
          try {
            ids[p.hash] = await store.putFile({ name: `${p.hash.slice(0, 16)}${p.mimeType === "image/png" ? ".png" : ""}`, mimeType: p.mimeType, data: p.data });
            break;
          } catch (e) {
            if (attempt === 3) {
              failed++;
              console.log(`  failed: ${p.hash.slice(0, 12)}: ${e instanceof Error ? e.message : e}`);
              break;
            }
            await new Promise((r) => setTimeout(r, 3000 * attempt));
          }
        }
        if (++done % 50 === 0) {
          save();
          console.log(`  ${done}/${todo.length}`);
        }
      }
    }),
  );
  save();

  // Rewrite the references in the paper files.
  let rewritten = 0;
  let missing = 0;
  for (const f of files) {
    const file = path.join(dir, f);
    const before = readFileSync(file, "utf8");
    const after = before.replace(TOKEN, (token, src: string, w?: string, h?: string) => {
      const id = ids[pictures.get(src)!.hash];
      if (!id) {
        missing++;
        return token;
      }
      return `{{img:${id}${w && h ? `|${w}|${h}` : ""}}}`;
    });
    if (after !== before) {
      writeFileSync(file, after);
      rewritten++;
    }
  }
  console.log(`${rewritten} paper files updated.` + (missing || failed ? ` ${failed} uploads failed; ${missing} references still point at files: run again.` : ""));
  if (missing || failed) process.exit(1);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
