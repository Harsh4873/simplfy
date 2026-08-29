import type { VisualSpec } from "../catalog/types";
import type { LibraryItem } from "../library/db";
import { composeBrief } from "../md/compose";
import type { InlineSpan, LabBrief } from "../md/types";

export type NoteLessonStep = {
  title: string;
  body: string;
};

export type NoteLesson = {
  title: string;
  dek: string;
  plain: string[];
  steps: NoteLessonStep[];
  takeaway: string;
  watchFor: string[];
  sayBackPrompt: string;
  sayBackModel: string;
  figure?: { spec: VisualSpec; kicker: string };
};

function spansText(spans: InlineSpan[]): string {
  return spans.map((span) => span.text).join("");
}

function tidy(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function paragraphsFromBrief(brief: LabBrief): { heading: string; body: string }[] {
  const out: { heading: string; body: string }[] = [];
  let heading = "";
  let body: string[] = [];
  const flush = () => {
    const text = tidy(body.join("\n\n"));
    if (heading || text) out.push({ heading: heading || "This note", body: text });
    heading = "";
    body = [];
  };
  for (const block of brief.blocks) {
    if (block.kind === "heading") {
      flush();
      heading = tidy(block.text);
      continue;
    }
    if (block.kind === "paragraph") {
      const text = tidy(spansText(block.spans));
      if (text) body.push(text);
    }
  }
  flush();
  return out.filter((row) => row.body.length >= 8);
}

export function lessonFromNote(item: LibraryItem): NoteLesson {
  const brief = item.brief ?? (item.text.trim() ? composeBrief(item.text, []) : null);
  const title = brief?.title || item.name;
  const sections = brief ? paragraphsFromBrief(brief) : [];
  const dek = tidy(brief?.dek || sections[0]?.body.slice(0, 220) || "This file is the lesson.");
  const plain = sections.slice(0, 4).map((row) => (row.heading ? `${row.heading}. ${row.body}` : row.body));
  const steps: NoteLessonStep[] = sections.length
    ? sections.map((row) => ({ title: row.heading, body: row.body }))
    : [{ title: title, body: tidy(item.text).slice(0, 1200) || "No extractable text in this file." }];
  const figureBlock = brief?.blocks.find((block) => block.kind === "figure");
  const takeaway = sections[sections.length - 1]?.body || dek;
  const watchFor = sections.slice(0, 4).map((row) => row.heading).filter((name) => name.length > 1);
  return {
    title,
    dek,
    plain: plain.length ? plain : [dek],
    steps,
    takeaway,
    watchFor: watchFor.length ? watchFor : ["Stay with what this file actually says. Do not swap in a catalogue plate."],
    sayBackPrompt: `In your own words, explain ${title}: what is this file claiming, and what would you refuse to confuse it with?`,
    sayBackModel: tidy(`${title}. ${dek} ${steps.map((step) => `${step.title}: ${step.body}`).join(" ")}`).slice(0, 1200),
    figure: figureBlock && figureBlock.kind === "figure" ? { spec: figureBlock.spec, kicker: figureBlock.kicker } : undefined,
  };
}
