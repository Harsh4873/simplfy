import { relatedModules } from "../catalog/search";
import type { StudyModule } from "../catalog/types";
import { relatedFromText } from "../library/fieldNote";
import type { StudioApi, Topic } from "./useStudio";

export function ConceptMap({
  topic,
  api,
}: {
  topic: Topic | null;
  api: StudioApi;
}) {
  if (!topic) {
    return (
      <div className="dock-empty">
        <p className="kicker">Map</p>
        <h2>No neighbourhood</h2>
        <p>Related plates appear once a topic is on the canvas.</p>
      </div>
    );
  }

  const center: StudyModule | null = topic.source === "catalog" ? topic.module : relatedFromText(`${topic.item.name} ${topic.item.text}`, api.modules)[0] ?? null;
  const nodes = center ? relatedModules(center, api.byId) : [];

  if (!center) {
    return (
      <div className="dock-empty">
        <p className="kicker">Map</p>
        <h2>No neighbourhood</h2>
        <p>No nearby catalogue plates for this note yet.</p>
      </div>
    );
  }

  const radius = 108;
  return (
    <div className="map">
      <p className="kicker">Concept map</p>
      <h2>Around {center.title}</h2>
      <svg className="map-svg" viewBox="0 0 280 280" role="img" aria-label={`Concepts related to ${center.title}`}>
        <circle cx="140" cy="140" r="118" fill="none" stroke="currentColor" opacity="0.2" />
        <circle cx="140" cy="140" r="78" fill="none" stroke="currentColor" opacity="0.08" />
        {nodes.map((node, i) => {
          const angle = (Math.PI * 2 * i) / Math.max(nodes.length, 1) - Math.PI / 2;
          const x = 140 + Math.cos(angle) * radius;
          const y = 140 + Math.sin(angle) * radius;
          return (
            <g key={node.id}>
              <line x1="140" y1="140" x2={x} y2={y} stroke="currentColor" opacity="0.28" />
              <circle cx={x} cy={y} r="4.5" fill={node.domain === "tb" ? "var(--accent)" : "currentColor"} />
            </g>
          );
        })}
        <circle cx="140" cy="140" r="7" fill="currentColor" />
      </svg>
      <ul className="map-list">
        <li className="is-center">{center.title}</li>
        {nodes.map((node) => (
          <li key={node.id}>
            <button type="button" className="text-btn" onClick={() => api.openModule(node)}>
              {node.title}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
