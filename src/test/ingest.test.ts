import { describe, expect, it } from "vitest";
import { pickDropFiles, inferCollectionName, shouldSkipRelPath, spawnPlan } from "../library/ingest";
import type { LibraryItem } from "../library/db";
import { loadCatalog } from "../catalog/loadCatalog";

function fileAt(rel: string, body = "x"): File {
  const name = rel.split("/").pop() ?? rel;
  const file = new File([body], name, { type: "text/markdown" });
  Object.defineProperty(file, "webkitRelativePath", { value: rel });
  return file;
}

describe("class ingest", () => {
  it("names the class from the dropped folder", () => {
    expect(inferCollectionName([fileAt("STAT651/week1/lrt.md"), fileAt("STAT651/week2/clt.md")])).toBe("STAT651");
    expect(inferCollectionName([fileAt("a.md")], "Host immunology")).toBe("Host immunology");
    expect(inferCollectionName([fileAt("lone.md")])).toBe("Inbox");
  });

  it("skips repo junk", () => {
    expect(shouldSkipRelPath(".git/config")).toBe(true);
    expect(shouldSkipRelPath("STAT651/node_modules/left-pad/index.js")).toBe(true);
    expect(shouldSkipRelPath("STAT651/week1/lecture.md")).toBe(false);
    expect(shouldSkipRelPath("STAT651/fig.png")).toBe(true);
    expect(shouldSkipRelPath("lab/yarn.lock")).toBe(true);
    expect(shouldSkipRelPath(".github/workflows/ci.yml")).toBe(true);
  });

  it("keeps lecture notes ahead of repo source when the drop is huge", () => {
    const files = [
      fileAt("TB651/src/pipeline.ts", "code"),
      fileAt("TB651/lectures/tnseq.md", "# TRANSIT"),
      fileAt("TB651/node_modules/left-pad/index.js", "module.exports"),
      fileAt("TB651/slides.pdf", "%PDF"),
    ];
    const kept = pickDropFiles(files).map((file) => file.name);
    expect(kept).toEqual(["tnseq.md", "slides.pdf", "pipeline.ts"]);
  });

  it("spawns lessons and gene lookups from filed notes", () => {
    const { modules } = loadCatalog();
    const items: LibraryItem[] = [
      {
        id: "n1",
        kind: "note",
        name: "TnSeq",
        mime: "text/markdown",
        size: 10,
        text: "TRANSIT",
        createdAt: 1,
        brief: {
          version: 1,
          title: "TnSeq",
          dek: "",
          stripped: "TRANSIT",
          blocks: [],
          hits: [{ contrast: "", gene: "prpD" }],
          links: [{ text: "TRANSIT", moduleId: "tb-tnseq-transit" }],
        },
      },
    ];
    const plan = spawnPlan(items, modules);
    expect(plan.moduleIds).toContain("tb-tnseq-transit");
    expect(plan.paperQueries).toContain("prpD");
  });
});
