import type { CheckItem } from "../catalog/types";

export type GradeResult = {
  ok: boolean;
  why: string;
};

function normalize(value: string): string {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export function gradeAnswer(item: CheckItem, given: string): GradeResult {
  const ok = normalize(given) === normalize(item.answer);
  if (ok) return { ok: true, why: item.why };
  const miss = item.whyWrong?.[given] ?? item.whyWrong?.[normalize(given)];
  return {
    ok: false,
    why: miss ?? item.why,
  };
}

export type RecallSeed = {
  moduleId: string;
  checkId: string;
  prompt: string;
  kind: CheckItem["kind"];
};

export function recallFromMiss(moduleId: string, item: CheckItem): RecallSeed {
  return {
    moduleId,
    checkId: item.id,
    prompt: item.prompt,
    kind: item.kind,
  };
}
