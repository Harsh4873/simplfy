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

function catalogueCard(rows: RecallCard[], moduleId: string, item: CheckItem): RecallCard | undefined {
  return rows.find((card) => card.moduleId === moduleId && card.checkId === item.id && !card.noteId);
}

/** Reuse the parked card for this check so a second miss does not insert another id. */
export function recallCardForMiss(
  rows: RecallCard[],
  moduleId: string,
  item: CheckItem,
  now = Date.now(),
): RecallCard {
  const seed = recallFromMiss(moduleId, item);
  const existing = catalogueCard(rows, moduleId, item);
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

/** Put a say-back card on the deck without counting the park as another miss. */
export function recallCardForPark(
  rows: RecallCard[],
  moduleId: string,
  item: CheckItem,
  now = Date.now(),
): RecallCard {
  const existing = catalogueCard(rows, moduleId, item);
  if (existing) {
    return {
      ...existing,
      prompt: item.prompt,
    };
  }
  return {
    id: crypto.randomUUID(),
    ...recallFromMiss(moduleId, item),
    createdAt: now,
    misses: 0,
    lastMissedAt: now,
  };
}
