import type { ReactNode } from "react";
import type {
  ConstellationVisual,
  DensityShiftVisual,
  FlowMapVisual,
  GeneTrackVisual,
  HierarchyVisual,
  LayeredSectionVisual,
  MechanismMapVisual,
  ModelPlateVisual,
  MutationGridVisual,
  NestedModelsVisual,
  SmallMultiplesVisual,
  VisualSpec,
} from "../catalog/types";

const ink = "#1a1612";
const fuchsin = "#9e3140";
const prussian = "#1e4854";
const buff = "#c79a4a";
const rule = "#d2c4ad";
const plate = "#f7f1e4";

function gaussian(x: number, mean: number, sd: number): number {
  const z = (x - mean) / sd;
  return Math.exp(-0.5 * z * z);
}

function densityPath(mean: number, sd: number, xMin: number, xMax: number, x0: number, x1: number, yBase: number, height: number): string {
  const n = 56;
  const ys: number[] = [];
  for (let i = 0; i <= n; i += 1) {
    const x = xMin + ((xMax - xMin) * i) / n;
    ys.push(gaussian(x, mean, sd));
  }
  const max = Math.max(...ys, 1e-6);
  return ys
    .map((y, i) => {
      const px = x0 + ((x1 - x0) * i) / n;
      const py = yBase - (y / max) * height;
      return `${i === 0 ? "M" : "L"}${px.toFixed(1)},${py.toFixed(1)}`;
    })
    .join(" ");
}

function SvgFrame({ children, wide }: { children: ReactNode; wide?: boolean }) {
  return (
    <svg
      className={wide ? "viz viz-wide" : "viz"}
      viewBox="0 0 640 300"
      role="img"
      aria-hidden="true"
    >
      <rect x="0.5" y="0.5" width="639" height="299" rx="2" fill={plate} stroke={rule} />
      {children}
    </svg>
  );
}

function LayeredSection({ spec }: { spec: LayeredSectionVisual }) {
  const h = 220 / spec.layers.length;
  const tones: Record<string, string> = {
    lipid: "#ead7a8",
    wall: "#d9b4a8",
    membrane: "#b9c7c4",
    core: "#cfd8d3",
    space: "#efe6d4",
  };
  return (
    <SvgFrame>
      {spec.layers.map((layer, i) => (
        <g key={layer.id} transform={`translate(36 ${36 + i * h})`}>
          <rect width="568" height={h - 6} fill={tones[layer.tone] ?? "#e6dcc8"} stroke={ink} strokeWidth="0.8" />
          <text x="16" y={h * 0.42} fill={ink} fontSize="13" fontFamily="IBM Plex Sans, sans-serif" fontWeight="600">
            {layer.label}
          </text>
          <text x="16" y={h * 0.72} fill={ink} fontSize="11" fontFamily="Source Serif 4, serif" opacity="0.75">
            {layer.detail}
          </text>
        </g>
      ))}
      {spec.annotation ? (
        <text x="36" y="286" fill={fuchsin} fontSize="11" fontFamily="IBM Plex Sans, sans-serif">
          {spec.annotation}
        </text>
      ) : null}
    </SvgFrame>
  );
}

function FlowMap({ spec }: { spec: FlowMapVisual }) {
  const byId = new Map(spec.nodes.map((node) => [node.id, node]));
  const tones: Record<string, { fill: string; stroke: string }> = {
    start: { fill: "#dfe8e6", stroke: prussian },
    process: { fill: "#f3ead8", stroke: ink },
    decision: { fill: "#f0ddb2", stroke: buff },
    end: { fill: "#edd5d4", stroke: fuchsin },
  };
  return (
    <SvgFrame>
      {spec.edges.map((edge) => {
        const a = byId.get(edge.from);
        const b = byId.get(edge.to);
        if (!a || !b) return null;
        const x1 = 40 + a.x * 5.6;
        const y1 = 36 + a.y * 2.3;
        const x2 = 40 + b.x * 5.6;
        const y2 = 36 + b.y * 2.3;
        const mx = (x1 + x2) / 2;
        const my = (y1 + y2) / 2;
        return (
          <g key={`${edge.from}-${edge.to}`}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={ink} strokeWidth="1.1" markerEnd="url(#arrow)" />
            {edge.label ? (
              <text x={mx} y={my - 6} textAnchor="middle" fontSize="10" fill={prussian} fontFamily="IBM Plex Sans, sans-serif">
                {edge.label}
              </text>
            ) : null}
          </g>
        );
      })}
      <defs>
        <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill={ink} />
        </marker>
      </defs>
      {spec.nodes.map((node) => {
        const x = 40 + node.x * 5.6;
        const y = 36 + node.y * 2.3;
        const tone = tones[node.tone ?? "process"];
        return (
          <g key={node.id} transform={`translate(${x} ${y})`}>
            <rect x="-58" y="-18" width="116" height="36" rx="2" fill={tone.fill} stroke={tone.stroke} />
            <text textAnchor="middle" y="-1" fontSize="11" fontFamily="IBM Plex Sans, sans-serif" fontWeight="600" fill={ink}>
              {node.label}
            </text>
            {node.detail ? (
              <text textAnchor="middle" y="12" fontSize="9" fontFamily="Source Serif 4, serif" fill={ink} opacity="0.7">
                {node.detail}
              </text>
            ) : null}
          </g>
        );
      })}
    </SvgFrame>
  );
}

function GeneTrack({ spec }: { spec: GeneTrackVisual }) {
  const x = (pos: number) => 48 + ((pos - spec.start) / (spec.end - spec.start)) * 544;
  return (
    <SvgFrame>
      <text x="48" y="36" fontSize="13" fontFamily="IBM Plex Mono, monospace" fill={prussian}>
        {spec.gene}
      </text>
      <text x="592" y="36" textAnchor="end" fontSize="11" fontFamily="IBM Plex Sans, sans-serif" fill={ink} opacity="0.7">
        {spec.unit}
      </text>
      <line x1="48" y1="150" x2="592" y2="150" stroke={ink} strokeWidth="3" />
      {spec.regions.map((region) => {
        const x1 = x(region.start);
        const x2 = x(region.end);
        return (
          <g key={region.label}>
            <rect x={x1} y="132" width={Math.max(x2 - x1, 4)} height="36" fill={fuchsin} opacity="0.22" stroke={fuchsin} />
            <text x={(x1 + x2) / 2} y="118" textAnchor="middle" fontSize="11" fontFamily="IBM Plex Sans, sans-serif" fill={fuchsin} fontWeight="600">
              {region.label}
            </text>
          </g>
        );
      })}
      {spec.marks.map((mark, i) => {
        const px = x(mark.pos);
        const up = i % 2 === 0;
        return (
          <g key={mark.label}>
            <line x1={px} y1="150" x2={px} y2={up ? 92 : 208} stroke={ink} />
            <circle cx={px} cy={up ? 92 : 208} r="3.5" fill={i === 2 ? fuchsin : prussian} />
            <text x={px} y={up ? 78 : 228} textAnchor="middle" fontSize="11" fontFamily="IBM Plex Mono, monospace" fill={ink}>
              {mark.label}
            </text>
            <text x={px} y={up ? 64 : 242} textAnchor="middle" fontSize="9" fontFamily="Source Serif 4, serif" fill={ink} opacity="0.7">
              {mark.note}
            </text>
          </g>
        );
      })}
      <text x="48" y="276" fontSize="11" fontFamily="IBM Plex Mono, monospace" fill={ink} opacity="0.65">
        {spec.start}
      </text>
      <text x="592" y="276" textAnchor="end" fontSize="11" fontFamily="IBM Plex Mono, monospace" fill={ink} opacity="0.65">
        {spec.end}
      </text>
    </SvgFrame>
  );
}

function NestedModels({ spec }: { spec: NestedModelsVisual }) {
  return (
    <SvgFrame>
      <rect x="36" y="48" width="250" height="200" rx="3" fill="#e7eef0" stroke={prussian} />
      <text x="48" y="70" fontSize="12" fontFamily="IBM Plex Sans, sans-serif" fill={prussian} fontWeight="600">
        {spec.full.label}
      </text>
      {spec.full.params.map((param, i) => (
        <text key={param} x="48" y={90 + i * 16} fontSize="11" fontFamily="IBM Plex Mono, monospace" fill={ink}>
          {param}
        </text>
      ))}
      <rect x="78" y="150" width="160" height="80" rx="3" fill="#f3ead8" stroke={fuchsin} />
      <text x="90" y="172" fontSize="12" fontFamily="IBM Plex Sans, sans-serif" fill={fuchsin} fontWeight="600">
        {spec.reduced.label}
      </text>
      {spec.reduced.params.map((param, i) => (
        <text key={param} x="90" y={192 + i * 14} fontSize="11" fontFamily="IBM Plex Mono, monospace" fill={ink}>
          {param}
        </text>
      ))}
      <path d={densityPath(-0.2, 0.9, -3, 3, 330, 610, 150, 70)} fill="none" stroke={prussian} strokeWidth="2" />
      <path d={densityPath(1.1, 0.55, -3, 3, 330, 610, 150, 88)} fill="none" stroke={fuchsin} strokeWidth="2" />
      <line x1="470" y1="168" x2="470" y2="92" stroke={buff} strokeWidth="1.6" strokeDasharray="3 3" />
      <text x="330" y="42" fontSize="12" fontFamily="IBM Plex Sans, sans-serif" fill={ink} fontWeight="600">
        {spec.statistic}
      </text>
      <text x="330" y="210" fontSize="12" fontFamily="IBM Plex Mono, monospace" fill={prussian}>
        {spec.reference}
      </text>
      <text x="330" y="258" fontSize="11" fontFamily="Source Serif 4, serif" fill={ink} opacity="0.75">
        Inner box = restrictions. Height of the dashed gap ≈ Λ.
      </text>
    </SvgFrame>
  );
}

function ModelPlate({ spec }: { spec: ModelPlateVisual }) {
  const byId = new Map(spec.nodes.map((node) => [node.id, node]));
  return (
    <SvgFrame>
      {spec.plates.map((item) => (
        <g key={item.id}>
          <rect
            x={item.x * 6.4}
            y={item.y * 3}
            width={item.w * 6.4}
            height={item.h * 3}
            fill="none"
            stroke={prussian}
            strokeDasharray="4 3"
          />
          <text x={item.x * 6.4 + 8} y={item.y * 3 + item.h * 3 - 10} fontSize="11" fill={prussian} fontFamily="IBM Plex Sans, sans-serif">
            {item.label}
          </text>
        </g>
      ))}
      {spec.edges.map((edge) => {
        const a = byId.get(edge.from);
        const b = byId.get(edge.to);
        if (!a || !b) return null;
        return (
          <line
            key={`${edge.from}-${edge.to}`}
            x1={a.x * 6.4}
            y1={a.y * 3}
            x2={b.x * 6.4}
            y2={b.y * 3}
            stroke={ink}
            markerEnd="url(#arrow2)"
          />
        );
      })}
      <defs>
        <marker id="arrow2" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill={ink} />
        </marker>
      </defs>
      {spec.nodes.map((node) => {
        const x = node.x * 6.4;
        const y = node.y * 3;
        const isDet = node.shape === "det";
        const isObs = node.shape === "obs";
        return (
          <g key={node.id} transform={`translate(${x} ${y})`}>
            {isDet ? (
              <polygon points="0,-14 14,0 0,14 -14,0" fill={plate} stroke={buff} strokeWidth="1.6" />
            ) : (
              <circle r="14" fill={isObs ? ink : plate} stroke={ink} strokeWidth="1.6" />
            )}
            <text
              textAnchor="middle"
              y={isObs && !isDet ? 4 : 4}
              fontSize="11"
              fill={isObs && !isDet ? plate : ink}
              fontFamily="IBM Plex Serif, Source Serif 4, serif"
            >
              {node.label}
            </text>
          </g>
        );
      })}
    </SvgFrame>
  );
}

function SmallMultiples({ spec }: { spec: SmallMultiplesVisual }) {
  const width = 560 / spec.panels.length;
  return (
    <SvgFrame>
      {spec.panels.map((panel, i) => {
        const max = Math.max(...panel.bars.map((bar) => bar.value), 1);
        return (
          <g key={panel.title} transform={`translate(${40 + i * width} 40)`}>
            <text fontSize="12" fontFamily="IBM Plex Sans, sans-serif" fontWeight="600" fill={ink}>
              {panel.title}
            </text>
            {panel.bars.map((bar, j) => {
              const bh = (bar.value / max) * 160;
              return (
                <g key={bar.label} transform={`translate(${j * 70} 0)`}>
                  <rect x="12" y={210 - bh} width="36" height={bh} fill={j === 0 ? prussian : fuchsin} opacity="0.85" />
                  <text x="30" y="228" textAnchor="middle" fontSize="10" fontFamily="IBM Plex Sans, sans-serif" fill={ink}>
                    {bar.label}
                  </text>
                </g>
              );
            })}
          </g>
        );
      })}
    </SvgFrame>
  );
}

function MechanismMap({ spec }: { spec: MechanismMapVisual }) {
  const byId = new Map(spec.nodes.map((node) => [node.id, node]));
  const fill: Record<string, string> = {
    drug: "#edd5d4",
    enzyme: "#f0ddb2",
    target: "#dfe8e6",
  };
  return (
    <SvgFrame>
      {spec.edges.map((edge) => {
        const a = byId.get(edge.from);
        const b = byId.get(edge.to);
        if (!a || !b) return null;
        const x1 = 20 + a.x * 6;
        const y1 = 28 + a.y * 2.6;
        const x2 = 20 + b.x * 6;
        const y2 = 28 + b.y * 2.6;
        return (
          <g key={`${edge.from}-${edge.to}`}>
            <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={ink} markerEnd="url(#arrow3)" />
            {edge.label ? (
              <text x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 6} textAnchor="middle" fontSize="9" fill={fuchsin} fontFamily="IBM Plex Sans, sans-serif">
                {edge.label}
              </text>
            ) : null}
          </g>
        );
      })}
      <defs>
        <marker id="arrow3" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 z" fill={ink} />
        </marker>
      </defs>
      {spec.nodes.map((node) => {
        const x = 20 + node.x * 6;
        const y = 28 + node.y * 2.6;
        return (
          <g key={node.id} transform={`translate(${x} ${y})`}>
            <rect x="-46" y="-18" width="92" height="36" rx="2" fill={fill[node.group] ?? plate} stroke={ink} />
            <text textAnchor="middle" y={node.sub ? -2 : 4} fontSize="11" fontFamily="IBM Plex Sans, sans-serif" fontWeight="600" fill={ink}>
              {node.label}
            </text>
            {node.sub ? (
              <text textAnchor="middle" y="12" fontSize="9" fontFamily="Source Serif 4, serif" fill={ink} opacity="0.7">
                {node.sub}
              </text>
            ) : null}
          </g>
        );
      })}
    </SvgFrame>
  );
}

function DensityShift({ spec }: { spec: DensityShiftVisual }) {
  const colors = [prussian, fuchsin, buff];
  const xs = spec.curves.flatMap((curve) => [curve.mean - 3 * curve.sd, curve.mean + 3 * curve.sd]);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  return (
    <SvgFrame>
      {spec.curves.map((curve, i) => (
        <g key={curve.id}>
          <path
            d={densityPath(curve.mean, curve.sd, xMin, xMax, 48, 600, 230, 160)}
            fill={colors[i % colors.length]}
            opacity="0.12"
            stroke={colors[i % colors.length]}
            strokeWidth="2"
          />
          <rect x={48 + i * 180} y="24" width="12" height="12" fill={colors[i % colors.length]} />
          <text x={66 + i * 180} y="35" fontSize="12" fontFamily="IBM Plex Sans, sans-serif" fill={ink}>
            {curve.label}
          </text>
        </g>
      ))}
      <line x1="48" y1="230" x2="600" y2="230" stroke={ink} />
      <text x="324" y="258" textAnchor="middle" fontSize="11" fontFamily="Source Serif 4, serif" fill={ink} opacity="0.75">
        {spec.xLabel}
      </text>
    </SvgFrame>
  );
}

function Hierarchy({ spec }: { spec: HierarchyVisual }) {
  return (
    <SvgFrame>
      {spec.layers.map((layer, i) => (
        <g key={layer.title} transform={`translate(28 ${28 + i * 66})`}>
          <text fontSize="11" fontFamily="IBM Plex Sans, sans-serif" fill={prussian} fontWeight="600">
            {layer.title}
          </text>
          {layer.nodes.map((node, j) => (
            <g key={node} transform={`translate(${j * 86} 18)`}>
              <rect width="78" height="32" rx="2" fill={i === 0 ? "#dfe8e6" : i === spec.layers.length - 1 ? "#edd5d4" : "#f3ead8"} stroke={ink} />
              <text x="39" y="21" textAnchor="middle" fontSize="11" fontFamily="IBM Plex Sans, sans-serif" fill={ink}>
                {node}
              </text>
            </g>
          ))}
        </g>
      ))}
    </SvgFrame>
  );
}

function MutationGrid({ spec }: { spec: MutationGridVisual }) {
  return (
    <div className="grid-plate" role="table" aria-label={spec.caption}>
      <div className="grid-plate-row grid-plate-head" role="row">
        <span>Allele</span>
        <span>Drug</span>
        <span>Usual read</span>
        <span>Note</span>
      </div>
      {spec.rows.map((row) => (
        <div className="grid-plate-row" role="row" key={`${row.gene}-${row.drug}`}>
          <span className="mono">{row.gene}</span>
          <span>{row.drug}</span>
          <span>{row.canonical}</span>
          <span className="muted">{row.note}</span>
        </div>
      ))}
    </div>
  );
}

function Constellation({ spec }: { spec: ConstellationVisual }) {
  const max = Math.max(...spec.terms.map((term) => term.weight), 1);
  return (
    <div className="constellation" aria-hidden="true">
      {spec.terms.map((term, i) => {
        const size = 0.85 + (term.weight / max) * 1.1;
        const col = i % 4;
        const row = Math.floor(i / 4);
        return (
          <span
            key={`${term.label}-${i}`}
            className="star"
            style={{
              fontSize: `${size}rem`,
              gridColumn: col + 1,
              gridRow: row + 1,
              color: i % 3 === 0 ? fuchsin : i % 3 === 1 ? prussian : ink,
            }}
          >
            {term.label}
          </span>
        );
      })}
    </div>
  );
}

export function VisualPlate({ spec, kicker }: { spec: VisualSpec; kicker: string }) {
  let figure: ReactNode;
  switch (spec.kind) {
    case "layered-section":
      figure = <LayeredSection spec={spec} />;
      break;
    case "flow-map":
      figure = <FlowMap spec={spec} />;
      break;
    case "gene-track":
      figure = <GeneTrack spec={spec} />;
      break;
    case "nested-models":
      figure = <NestedModels spec={spec} />;
      break;
    case "model-plate":
      figure = <ModelPlate spec={spec} />;
      break;
    case "small-multiples":
      figure = <SmallMultiples spec={spec} />;
      break;
    case "mechanism-map":
      figure = <MechanismMap spec={spec} />;
      break;
    case "density-shift":
      figure = <DensityShift spec={spec} />;
      break;
    case "hierarchy":
      figure = <Hierarchy spec={spec} />;
      break;
    case "mutation-grid":
      figure = <MutationGrid spec={spec} />;
      break;
    case "constellation":
      figure = <Constellation spec={spec} />;
      break;
    default:
      figure = null;
  }
  return (
    <figure className="plate">
      <figcaption className="plate-kicker">{kicker}</figcaption>
      {figure}
      <p className="plate-caption">{spec.caption}</p>
    </figure>
  );
}
