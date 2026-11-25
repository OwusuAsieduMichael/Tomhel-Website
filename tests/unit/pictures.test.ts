import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { plainQuestionText, QuestionText } from "@/components/prep/question-text";
import { LocalFileBackend, MemoryBackend } from "@/lib/prep/store/backend";

vi.mock("next/cache", () => ({ revalidateTag: () => {}, unstable_cache: () => () => Promise.resolve(null) }));
const { GasBackend } = await import("@/lib/prep/store/gas-backend");

const png = Buffer.from("89504e470d0a1a0a", "hex");
const html = (text: string) => renderToStaticMarkup(createElement(QuestionText, { text }));

describe("question text markup", () => {
  it("shows a small picture inside the sentence and a large one on its own line", () => {
    const out = html("If {{img:abcdefghij12|56|21}} evaluate {{img:diagramdiagram1|320|200}}.");
    expect(out).toContain('src="/prep/media/abcdefghij12"');
    expect(out).toMatch(/<img[^>]*abcdefghij12[^>]*class="[^"]*inline-block/);
    expect(out).toMatch(/<img[^>]*diagramdiagram1[^>]*class="[^"]*\bblock\b/);
    expect(out.startsWith("If ")).toBe(true);
  });

  it("keeps underlines and never turns text into HTML", () => {
    const out = html("The <u>dubious</u> man <b>wrote</b> {{img:../../etc}}");
    expect(out).toContain("<u");
    expect(out).toContain("dubious</u>");
    expect(out).toContain("&lt;b&gt;wrote&lt;/b&gt;");
    // Not a valid picture id: left as text, no <img>.
    expect(out).not.toContain("<img");
  });

  it("gives a plain version for places that need one", () => {
    expect(plainQuestionText("Find <u>x</u> in {{img:abcdefghij12|5|5}}")).toBe("Find x in [picture]");
  });
});

describe("picture store", () => {
  let dir: string | undefined;
  afterEach(() => dir && rmSync(dir, { recursive: true, force: true }));

  it("keeps pictures in memory and in the local demo store", async () => {
    dir = mkdtempSync(path.join(tmpdir(), "prep-files-"));
    for (const backend of [new MemoryBackend(), new LocalFileBackend(path.join(dir, "data.json"))]) {
      const id = await backend.putFile({ name: "eq.png", mimeType: "image/png", data: png });
      expect(await backend.getFile(id)).toEqual({ mimeType: "image/png", data: png });
      expect(await backend.getFile("nosuchpicture1")).toBeNull();
      expect(await backend.getFile("../data.json")).toBeNull();
      await expect(backend.putFile({ name: "x.svg", mimeType: "image/svg+xml", data: png })).rejects.toThrow(/PNG/);
    }
  });

  it("sends pictures to the Apps Script as base64 and reads them back", async () => {
    const sent: Record<string, unknown>[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: string, init: { body: string }) => {
        const body = JSON.parse(init.body);
        sent.push(body);
        if (body.action === "putFile") return { status: 200, json: async () => ({ success: true, id: "1AbCdEfGhIjK" }) };
        if (body.id === "1AbCdEfGhIjK") return { status: 200, json: async () => ({ success: true, mimeType: "image/png", data: png.toString("base64") }) };
        return { status: 200, json: async () => ({ success: false, message: "No item with the given ID could be found." }) };
      }),
    );
    const gas = new GasBackend({ url: "https://example.test/exec", secret: "x".repeat(40), cache: false });
    expect(await gas.putFile({ name: "eq.png", mimeType: "image/png", data: png })).toBe("1AbCdEfGhIjK");
    expect(sent[0]).toMatchObject({ action: "putFile", mimeType: "image/png", data: png.toString("base64") });
    expect(await gas.getFile("1AbCdEfGhIjK")).toEqual({ mimeType: "image/png", data: png });
    expect(await gas.getFile("1UnknownPicture")).toBeNull();
    vi.unstubAllGlobals();
  });
});
