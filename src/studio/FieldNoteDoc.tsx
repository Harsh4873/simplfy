import { VisualPlate } from "../visuals/VisualPlate";
import { composeBrief } from "../md/compose";
import { linkifyMarkdown } from "../md/linkify";
import type { InlineSpan, LabBrief } from "../md/types";
import type { StudyModule } from "../catalog/types";
import type { LibraryItem } from "../library/db";

function renderSpans(
  spans: InlineSpan[],
  modules: StudyModule[],
  onOpen: (module: StudyModule) => void,
) {
  const byId = new Map(modules.map((module) => [module.id, module]));
  return spans.map((span, index) => {
    if (span.kind === "plate") {
      const module = byId.get(span.moduleId);
      if (!module) {
        return (
          <span key={`${span.text}-${index}`} className={span.strong ? "em" : undefined}>
            {span.text}
          </span>
        );
      }
      return (
        <button
          key={`${span.moduleId}-${index}`}
          type="button"
          className="plate-link"
          onClick={() => onOpen(module)}
        >
          {span.strong ? <strong>{span.text}</strong> : span.text}
        </button>
      );
    }
    if (span.strong) {
      return <strong key={`s-${index}`}>{span.text}</strong>;
    }
    return <span key={`t-${index}`}>{span.text}</span>;
  });
}

function BriefBody({
  brief,
  modules,
  onOpen,
}: {
  brief: LabBrief;
  modules: StudyModule[];
  onOpen: (module: StudyModule) => void;
}) {
  return (
    <div className="brief">
      {brief.blocks.map((block, index) => {
        if (block.kind === "heading") {
          const Tag = block.level === 3 ? "h3" : "h2";
          return (
            <Tag key={`h-${index}`}>{renderSpans(linkifyMarkdown(block.text, modules), modules, onOpen)}</Tag>
          );
        }
        if (block.kind === "paragraph") {
          return <p key={`p-${index}`}>{renderSpans(block.spans, modules, onOpen)}</p>;
        }
        if (block.kind === "table") {
          return (
            <div key={`t-${index}`} className="brief-table-wrap">
              {block.caption ? <p className="kicker">{block.caption}</p> : null}
              <table className="brief-table">
                <thead>
                  <tr>
                    {block.columns.map((column) => (
                      <th key={column}>{column}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {block.rows.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {row.map((cell, cellIndex) => (
                        <td key={cellIndex} className={cellIndex >= 2 ? "mono" : undefined}>
                          {renderSpans(linkifyMarkdown(cell, modules), modules, onOpen)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        return <VisualPlate key={`f-${index}`} spec={block.spec} kicker={block.kicker} />;
      })}
    </div>
  );
}

export function FieldNoteDoc({
  item,
  modules,
  onOpen,
}: {
  item: LibraryItem;
  modules: StudyModule[];
  onOpen: (module: StudyModule) => void;
}) {
  const brief = item.brief ?? (item.text.trim() ? composeBrief(item.text, modules) : null);
  return (
    <>
      <header className="stage-head">
        <p className="kicker">
          <span className="domain library">Local</span> Field note · Fig. L
        </p>
        <h1>{brief?.title ?? item.name}</h1>
        <p className="dek">
          {brief ? renderSpans(linkifyMarkdown(brief.dek, modules), modules, onOpen) : item.parseNote}
        </p>
      </header>
      {brief ? (
        <BriefBody brief={brief} modules={modules} onOpen={onOpen} />
      ) : (
        <p className="dek">No extractable text. The blob is still in the library.</p>
      )}
      {item.text ? (
        <details className="raw-dump">
          <summary>Raw dump</summary>
          <pre>{item.text}</pre>
        </details>
      ) : null}
    </>
  );
}
