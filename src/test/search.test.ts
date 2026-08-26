import { describe, expect, it } from "vitest";
import { loadCatalog } from "../catalog/loadCatalog";
import { searchCatalog, searchStudio } from "../catalog/search";

describe("search", () => {
  const { modules } = loadCatalog();

  it("finds the likelihood ratio test from a lab-style query", () => {
    const hits = searchCatalog("likelihood ratio test", modules);
    expect(hits[0]?.kind).toBe("module");
    if (hits[0]?.kind === "module") {
      expect(hits[0].module.id).toBe("stats-lrt");
    }
  });

  it("finds rifampin / rpoB", () => {
    const a = searchCatalog("rifampin", modules);
    const b = searchCatalog("rpoB", modules);
    expect(a[0]?.kind === "module" && a[0].module.id).toBe("tb-rifampin");
    expect(b.some((hit) => hit.kind === "module" && hit.module.id === "tb-rifampin")).toBe(true);
  });

  it("includes local library notes", () => {
    const hits = searchStudio("caseum hypoxia", modules, [
      { id: "n1", name: "granuloma scrap", text: "caseum is hypoxic and acidic" },
    ]);
    expect(hits.some((hit) => hit.kind === "library" && hit.item.id === "n1")).toBe(true);
  });
});
