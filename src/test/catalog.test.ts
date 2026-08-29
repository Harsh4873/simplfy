import { describe, expect, it } from "vitest";
import { loadCatalog } from "../catalog/loadCatalog";
import { VISUAL_KINDS } from "../catalog/types";
import { validateModule } from "../catalog/validate";

describe("catalogue", () => {
  it("loads a first-wave set of valid modules", () => {
    const { modules, errors } = loadCatalog();
    expect(errors).toEqual([]);
    expect(modules.length).toBeGreaterThanOrEqual(12);
    const ids = new Set(modules.map((module) => module.id));
    expect(ids.has("stats-lrt")).toBe(true);
    expect(ids.has("tb-rifampin")).toBe(true);
    expect(ids.has("tb-tnseq-transit")).toBe(true);
    expect(ids.has("stats-normal-clt")).toBe(true);
    expect(ids.has("tb-cholesterol-catabolism")).toBe(true);
    for (const module of modules) {
      expect(validateModule(module)).toEqual([]);
      expect(module.story.join(" ").length).toBeGreaterThan(200);
      expect(VISUAL_KINDS.includes(module.visual.kind)).toBe(true);
      const kinds = new Set(module.check.map((item) => item.kind));
      expect(kinds.has("conceptual")).toBe(true);
      expect(kinds.has("figure") || kinds.has("calculation")).toBe(true);
    }
  });

  it("keeps related ids inside the catalogue", () => {
    const { modules } = loadCatalog();
    const ids = new Set(modules.map((module) => module.id));
    for (const module of modules) {
      for (const related of module.related) {
        expect(ids.has(related), `${module.id} -> ${related}`).toBe(true);
      }
    }
  });
});
