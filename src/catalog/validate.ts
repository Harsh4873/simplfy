import type { CheckItem, Domain, Source, StudyModule, VisualSpec, WorkedStep } from "./types";
import { VISUAL_KINDS } from "./types";

export type ValidationIssue = { path: string; message: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function asStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function validateSource(value: unknown, path: string, issues: ValidationIssue[]) {
  if (!isRecord(value)) {
    issues.push({ path, message: "source must be an object" });
    return;
  }
  if (!asString(value.title)) issues.push({ path: `${path}.title`, message: "required" });
  if (!asString(value.attribution)) issues.push({ path: `${path}.attribution`, message: "required" });
  if (!asString(value.license)) issues.push({ path: `${path}.license`, message: "required" });
}

function validateCheck(value: unknown, path: string, issues: ValidationIssue[]) {
  if (!isRecord(value)) {
    issues.push({ path, message: "check item must be an object" });
    return;
  }
  if (!asString(value.id)) issues.push({ path: `${path}.id`, message: "required" });
  if (value.kind !== "conceptual" && value.kind !== "calculation" && value.kind !== "figure") {
    issues.push({ path: `${path}.kind`, message: "must be conceptual, calculation, or figure" });
  }
  if (!asString(value.prompt)) issues.push({ path: `${path}.prompt`, message: "required" });
  if (!asStringArray(value.choices) || value.choices.length < 2) {
    issues.push({ path: `${path}.choices`, message: "need at least two choices" });
  }
  if (!asString(value.answer)) issues.push({ path: `${path}.answer`, message: "required" });
  if (asStringArray(value.choices) && asString(value.answer) && !value.choices.includes(value.answer)) {
    issues.push({ path: `${path}.answer`, message: "answer must match a choice" });
  }
  if (!asString(value.why)) issues.push({ path: `${path}.why`, message: "required" });
}

function validateStep(value: unknown, path: string, issues: ValidationIssue[]) {
  if (!isRecord(value)) {
    issues.push({ path, message: "step must be an object" });
    return;
  }
  if (!asString(value.title)) issues.push({ path: `${path}.title`, message: "required" });
  if (!asString(value.body)) issues.push({ path: `${path}.body`, message: "required" });
}

function validateVisual(value: unknown, path: string, issues: ValidationIssue[]) {
  if (!isRecord(value)) {
    issues.push({ path, message: "visual must be an object" });
    return;
  }
  if (!asString(value.kind) || !VISUAL_KINDS.includes(value.kind as (typeof VISUAL_KINDS)[number])) {
    issues.push({ path: `${path}.kind`, message: "unknown visual kind" });
    return;
  }
  if (!asString(value.caption)) issues.push({ path: `${path}.caption`, message: "required" });
}

export function validateModule(value: unknown, path = "$"): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!isRecord(value)) {
    return [{ path, message: "module must be an object" }];
  }
  if (!asString(value.id)) issues.push({ path: `${path}.id`, message: "required" });
  if (!asString(value.title)) issues.push({ path: `${path}.title`, message: "required" });
  if (!asString(value.dek)) issues.push({ path: `${path}.dek`, message: "required" });
  if (value.domain !== "tb" && value.domain !== "stats") {
    issues.push({ path: `${path}.domain`, message: "must be tb or stats" });
  }
  if (!asStringArray(value.aliases)) issues.push({ path: `${path}.aliases`, message: "string array required" });
  if (!asStringArray(value.tags)) issues.push({ path: `${path}.tags`, message: "string array required" });
  if (!asStringArray(value.story) || value.story.length < 1) {
    issues.push({ path: `${path}.story`, message: "need at least one paragraph" });
  }
  if (!asString(value.deepTitle)) issues.push({ path: `${path}.deepTitle`, message: "required" });
  if (!asStringArray(value.deep) || value.deep.length < 1) {
    issues.push({ path: `${path}.deep`, message: "need at least one paragraph" });
  }
  if (!Array.isArray(value.sources) || value.sources.length < 1) {
    issues.push({ path: `${path}.sources`, message: "need at least one source" });
  } else {
    value.sources.forEach((source, i) => validateSource(source, `${path}.sources[${i}]`, issues));
  }
  if (!asStringArray(value.related)) issues.push({ path: `${path}.related`, message: "string array required" });
  if (!isRecord(value.example)) {
    issues.push({ path: `${path}.example`, message: "required" });
  } else {
    if (!asString(value.example.title)) issues.push({ path: `${path}.example.title`, message: "required" });
    if (!asString(value.example.setup)) issues.push({ path: `${path}.example.setup`, message: "required" });
    if (!asString(value.example.takeaway)) issues.push({ path: `${path}.example.takeaway`, message: "required" });
    if (!Array.isArray(value.example.steps) || value.example.steps.length < 2) {
      issues.push({ path: `${path}.example.steps`, message: "need at least two steps" });
    } else {
      value.example.steps.forEach((step, i) => validateStep(step, `${path}.example.steps[${i}]`, issues));
    }
  }
  if (!Array.isArray(value.check) || value.check.length < 2) {
    issues.push({ path: `${path}.check`, message: "need at least two check items" });
  } else {
    value.check.forEach((item, i) => validateCheck(item, `${path}.check[${i}]`, issues));
    const kinds = new Set(value.check.map((item) => (isRecord(item) ? item.kind : null)));
    if (!kinds.has("conceptual")) {
      issues.push({ path: `${path}.check`, message: "need a conceptual item" });
    }
  }
  validateVisual(value.visual, `${path}.visual`, issues);
  return issues;
}

export function isStudyModule(value: unknown): value is StudyModule {
  return validateModule(value).length === 0;
}

export type { CheckItem, Domain, Source, VisualSpec, WorkedStep };
