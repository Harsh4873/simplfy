import type { StudyModule } from "../catalog/types";
import { lessonFromModule } from "../lesson/fromModule";
import { cx } from "../ui/cx";

export function ModuleCard({
  module,
  onOpen,
  kicker,
}: {
  module: StudyModule;
  onOpen: (module: StudyModule) => void;
  kicker?: string;
}) {
  const lesson = lessonFromModule(module);
  return (
    <button type="button" className="module-card" onClick={() => onOpen(module)}>
      <span className="card-top">
        <span className={cx("domain", module.domain)}>{module.domain === "tb" ? "TB" : "Stats"}</span>
        {lesson.featured ? <span className="pill">Guided</span> : null}
        {kicker ? <span className="muted">{kicker}</span> : null}
      </span>
      <span className="hit-title">{module.title}</span>
      <span className="hit-dek">{lesson.overlay.analogy.title}</span>
      <span className="hit-meta">{module.dek}</span>
    </button>
  );
}
