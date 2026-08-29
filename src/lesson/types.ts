import type { StudyModule } from "../catalog/types";

export type Analogy = {
  title: string;
  body: string;
};

export type LessonOverlay = {
  analogy: Analogy;
  plain: string[];
  whyItMatters: string;
  watchFor: string[];
  sayBackPrompt: string;
  sayBackModel: string;
};

export type Lesson = {
  module: StudyModule;
  overlay: LessonOverlay;
  featured: boolean;
};
