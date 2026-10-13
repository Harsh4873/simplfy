import type { CheckItem } from "../catalog/types";
import type { RecallCard } from "../library/db";

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

/** Reuse the parked card for this check so a second click does not insert another id. */
export function recallCardForMiss(
  rows: RecallCard[],
  moduleId: string,
  item: CheckItem,
  now = Date.now(),
): RecallCard {
  const seed = recallFromMiss(moduleId, item);
  const existing = rows.find(
    (card) => card.moduleId === moduleId && card.checkId === item.id && !card.noteId,
  );
  if (existing) {
    return {
      ...existing,
      misses: existing.misses + 1,
      lastMissedAt: now,
      prompt: item.prompt,
      collectionId: undefined,
    };
  }
  return {
    id: crypto.randomUUID(),
    ...seed,
    createdAt: now,
    misses: 1,
    lastMissedAt: now,
  };
}
