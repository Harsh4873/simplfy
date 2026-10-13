import { describe, expect, it } from "vitest";
import { indexModules, loadCatalog } from "../catalog/loadCatalog";
import { relatedModules, searchCatalog, searchStudio } from "../catalog/search";

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

  it("maps only the declared related plates", () => {
    const byId = indexModules(modules);
    const sparse = modules.find((module) => module.related.length > 0 && module.related.length < 10);
    expect(sparse).toBeTruthy();
    const related = relatedModules(sparse!, byId);
    expect(related.map((row) => row.id)).toEqual(sparse!.related.filter((id) => byId.has(id)));
    expect(related.length).toBeLessThan(10);
  });
});
