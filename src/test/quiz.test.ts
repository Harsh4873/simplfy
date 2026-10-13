import { describe, expect, it } from "vitest";
import { loadCatalog } from "../catalog/loadCatalog";
import { gradeAnswer, recallCardForMiss, recallFromMiss } from "../quiz/grade";

describe("check grading", () => {
  it("accepts the canonical choice and explains misses", () => {
    const { modules } = loadCatalog();
    const lrt = modules.find((module) => module.id === "stats-lrt");
    expect(lrt).toBeTruthy();
    const item = lrt!.check.find((row) => row.id === "lrt-calc")!;
    expect(gradeAnswer(item, item.answer).ok).toBe(true);
    const miss = gradeAnswer(item, item.choices[0]);
    expect(miss.ok).toBe(false);
    expect(miss.why.length).toBeGreaterThan(20);
  });

  it("seeds a recall card from a miss", () => {
    const { modules } = loadCatalog();
    const rif = modules.find((module) => module.id === "tb-rifampin")!;
    const seed = recallFromMiss(rif.id, rif.check[0]);
    expect(seed.moduleId).toBe("tb-rifampin");
    expect(seed.checkId).toBe(rif.check[0].id);
  });

  it("reuses a parked card instead of minting a second id", () => {
    const item = {
      id: "say-back",
      kind: "conceptual" as const,
      prompt: "Explain it",
      choices: [],
      answer: "In your own words",
      why: "Because the point should stick.",
    };
    const first = recallCardForMiss([], "tb-rifampin", item, 10);
    const second = recallCardForMiss([first], "tb-rifampin", item, 20);
    expect(second.id).toBe(first.id);
    expect(second.misses).toBe(2);
    expect(second.lastMissedAt).toBe(20);
  });
});
