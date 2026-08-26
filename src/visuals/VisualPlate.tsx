import { createContext, useContext, useId, type ReactNode, type SVGProps } from "react";
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
import { along, densityPath, vis } from "./theme";

const MarkerId = createContext("arr");

function PlateFrame({ children }: { children: ReactNode }) {
  const raw = useId().replace(/[^a-zA-Z0-9]/g, "");
  const marker = `arr${raw}`;
  return (
    <svg className="viz" viewBox="0 0 640 300" role="img" aria-hidden="true">
      <defs>
        <marker id={marker} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
          <path d="M1 1.5 L8.5 5 L1 8.5" fill="none" stroke={vis.ink} strokeWidth="1.35" />
        </marker>
      </defs>
      <rect x="0.5" y="0.5" width="639" height="299" fill={vis.paper} stroke={vis.rule} strokeWidth="1" />
      <g stroke={vis.ink} strokeWidth={vis.sw} fill="none">
        <path d="M14 26h14M14 26v14" />
        <path d="M626 26h-14M626 26v14" />
        <path d="M14 274h14M14 274v-14" />
        <path d="M626 274h-14M626 274v-14" />
      </g>
      <MarkerId.Provider value={marker}>{children}</MarkerId.Provider>
    </svg>
  );
}

function Label({
  children,
  mono,
  mute,
  weight,
  ...rest
}: SVGProps<SVGTextElement> & { mono?: boolean; mute?: boolean; weight?: number }) {
  return (
    <text
      fontFamily={mono ? vis.mono : vis.sans}
      fill={mute ? vis.mute : vis.ink}
      fontWeight={weight ?? 400}
      {...rest}
    >
      {children}
    </text>
  );
}

function LayeredSection({ spec }: { spec: LayeredSectionVisual }) {
  const h = 220 / spec.layers.length;
  const fill: Record<string, number> = {
    lipid: 0.05,
    wall: 0.1,
    membrane: 0.14,
    core: 0.18,
    space: 0.03,
  };
  return (
    <PlateFrame>
      {spec.layers.map((layer, i) => {
        const y = 32 + i * h;
        const accented = Boolean(spec.annotation && i < 2);
        return (
          <g key={layer.id}>
            <rect
              x="36"
              y={y}
              width="568"
              height={h - 4}
              fill={vis.ink}
              fillOpacity={fill[layer.tone] ?? 0.08}
              stroke={vis.ink}
              strokeWidth={vis.hair}
            />
            {accented ? <rect x="36" y={y} width="3" height={h - 4} fill={vis.accent} /> : null}
            <Label x="52" y={y + h * 0.42} fontSize="12" weight={500}>
              {String(i + 1).padStart(2, "0")}  {layer.label}
            </Label>
            <Label x="52" y={y + h * 0.72} fontSize="10.5" mute>
              {layer.detail}
            </Label>
          </g>
        );
      })}
      {spec.annotation ? (
        <Label x="36" y="288" fontSize="10.5" fill={vis.accent}>
          {spec.annotation}
        </Label>
      ) : null}
    </PlateFrame>
  );
}

function FlowMap({ spec }: { spec: FlowMapVisual }) {
  const marker = useContext(MarkerId);
  const byId = new Map(spec.nodes.map((node) => [node.id, node]));
  return (
    <PlateFrame>
      {spec.edges.map((edge) => {
        const a = byId.get(edge.from);
        const b = byId.get(edge.to);
        if (!a || !b) return null;
        const x1 = 40 + a.x * 5.6;
        const y1 = 36 + a.y * 2.3;
        const x2 = 40 + b.x * 5.6;
        const y2 = 36 + b.y * 2.3;
        const [sx, sy, ex, ey] = along(x1, y1, x2, y2, 22, 24);
        const mx = (sx + ex) / 2;
        const my = (sy + ey) / 2;
        return (
          <g key={`${edge.from}-${edge.to}`}>
            <line x1={sx} y1={sy} x2={ex} y2={ey} stroke={vis.ink} strokeWidth={vis.sw} markerEnd={`url(#${marker})`} />
            {edge.label ? (
              <Label x={mx} y={my - 6} textAnchor="middle" fontSize="9.5" mute>
                {edge.label}
              </Label>
            ) : null}
          </g>
        );
      })}
      {spec.nodes.map((node) => {
        const x = 40 + node.x * 5.6;
        const y = 36 + node.y * 2.3;
        const tone = node.tone ?? "process";
        const filled = tone === "start";
        const end = tone === "end";
        const decision = tone === "decision";
        return (
          <g key={node.id} transform={`translate(${x} ${y})`}>
            <rect
              x="-58"
              y="-18"
              width="116"
              height="36"
              fill={filled ? vis.ink : vis.paper}
              stroke={end ? vis.accent : vis.ink}
              strokeWidth={vis.sw}
              strokeDasharray={decision ? "3.5 2.5" : undefined}
            />
            <Label
              textAnchor="middle"
              y={node.detail ? -2 : 4}
              fontSize={node.label.length > 22 ? 9.5 : 11}
              weight={500}
              fill={filled ? vis.paper : vis.ink}
            >
              {node.label}
            </Label>
            {node.detail ? (
              <Label textAnchor="middle" y="12" fontSize="9" mute fill={filled ? vis.paper : vis.mute}>
                {node.detail}
              </Label>
            ) : null}
          </g>
        );
      })}
    </PlateFrame>
  );
}

function GeneTrack({ spec }: { spec: GeneTrackVisual }) {
  const x = (pos: number) => 48 + ((pos - spec.start) / (spec.end - spec.start)) * 544;
  const ticks = 6;
  return (
    <PlateFrame>
      <Label x="48" y="34" fontSize="13" mono weight={500}>
        {spec.gene}
      </Label>
      <Label x="592" y="34" textAnchor="end" fontSize="11" mute>
        {spec.unit}
      </Label>
      <line x1="48" y1="150" x2="592" y2="150" stroke={vis.ink} strokeWidth="2" />
      {Array.from({ length: ticks + 1 }, (_, i) => {
        const pos = spec.start + ((spec.end - spec.start) * i) / ticks;
        const px = x(pos);
        return (
          <g key={pos}>
            <line x1={px} y1="146" x2={px} y2="154" stroke={vis.ink} strokeWidth={vis.hair} />
          </g>
        );
      })}
      {spec.regions.map((region) => {
        const x1 = x(region.start);
        const x2 = x(region.end);
        return (
          <g key={region.label}>
            <rect x={x1} y="136" width={Math.max(x2 - x1, 4)} height="28" fill={vis.accent} fillOpacity="0.14" stroke={vis.accent} strokeWidth={vis.sw} />
            <Label x={(x1 + x2) / 2} y="126" textAnchor="middle" fontSize="11" weight={500} fill={vis.accent}>
              {region.label}
            </Label>
          </g>
        );
      })}
      {spec.marks.map((mark, i) => {
        const px = x(mark.pos);
        const up = i % 2 === 0;
        return (
          <g key={mark.label}>
            <line x1={px} y1="150" x2={px} y2={up ? 88 : 204} stroke={vis.ink} strokeWidth={vis.hair} />
            <circle cx={px} cy={up ? 88 : 204} r="3" fill={vis.ink} />
            <Label x={px} y={up ? 76 : 222} textAnchor="middle" fontSize="11" mono>
              {mark.label}
            </Label>
            <Label x={px} y={up ? 62 : 236} textAnchor="middle" fontSize="9" mute>
              {mark.note}
            </Label>
          </g>
        );
      })}
      <Label x="48" y="278" fontSize="11" mono mute>
        {spec.start}
      </Label>
      <Label x="592" y="278" textAnchor="end" fontSize="11" mono mute>
        {spec.end}
      </Label>
    </PlateFrame>
  );
}

function NestedModels({ spec }: { spec: NestedModelsVisual }) {
  return (
    <PlateFrame>
      <rect x="36" y="44" width="250" height="200" fill={vis.paper} stroke={vis.ink} strokeWidth={vis.sw} />
      <Label x="48" y="66" fontSize="12" weight={500}>
        {spec.full.label}
      </Label>
      {spec.full.params.map((param, i) => (
        <Label key={param} x="48" y={86 + i * 16} fontSize="11" mono>
          {param}
        </Label>
      ))}
      <rect x="78" y="148" width="168" height="80" fill={vis.paper} stroke={vis.accent} strokeWidth={vis.sw} />
      <Label x="90" y="170" fontSize="12" weight={500} fill={vis.accent}>
        {spec.reduced.label}
      </Label>
      {spec.reduced.params.map((param, i) => (
        <Label key={param} x="90" y={188 + i * 14} fontSize="11" mono>
          {param}
        </Label>
      ))}
      <path d={densityPath(-0.2, 0.9, -3, 3, 330, 610, 150, 70)} fill="none" stroke={vis.ink} strokeWidth="1.6" />
      <path d={densityPath(1.1, 0.55, -3, 3, 330, 610, 150, 88)} fill="none" stroke={vis.accent} strokeWidth="1.6" />
      <line x1="470" y1="168" x2="470" y2="92" stroke={vis.ink} strokeWidth={vis.sw} strokeDasharray="3 3" />
      <Label x="476" y="108" fontSize="11" mono>
        Λ
      </Label>
      <Label x="330" y="40" fontSize="12" weight={500} mono>
        {spec.statistic}
      </Label>
      <Label x="330" y="214" fontSize="12" mono mute>
        {spec.reference}
      </Label>
      <Label x="330" y="258" fontSize="10.5" mute>
        Inner box = restrictions. Height of the dashed gap ≈ Λ.
      </Label>
    </PlateFrame>
  );
}

function ModelPlate({ spec }: { spec: ModelPlateVisual }) {
  const marker = useContext(MarkerId);
  const byId = new Map(spec.nodes.map((node) => [node.id, node]));
  return (
    <PlateFrame>
      {spec.plates.map((item) => (
        <g key={item.id}>
          <rect
            x={item.x * 6.4}
            y={item.y * 3}
            width={item.w * 6.4}
            height={item.h * 3}
            fill="none"
            stroke={vis.ink}
            strokeWidth={vis.hair}
            strokeDasharray="4 3"
          />
          <Label x={item.x * 6.4 + 8} y={item.y * 3 + item.h * 3 - 10} fontSize="11" mute>
            {item.label}
          </Label>
        </g>
      ))}
      {spec.edges.map((edge) => {
        const a = byId.get(edge.from);
        const b = byId.get(edge.to);
        if (!a || !b) return null;
        const x1 = a.x * 6.4;
        const y1 = a.y * 3;
        const x2 = b.x * 6.4;
        const y2 = b.y * 3;
        const [sx, sy, ex, ey] = along(x1, y1, x2, y2, 16, 16);
        return (
          <line
            key={`${edge.from}-${edge.to}`}
            x1={sx}
            y1={sy}
            x2={ex}
            y2={ey}
            stroke={vis.ink}
            strokeWidth={vis.sw}
            markerEnd={`url(#${marker})`}
          />
        );
      })}
      {spec.nodes.map((node) => {
        const x = node.x * 6.4;
        const y = node.y * 3;
        const isDet = node.shape === "det";
        const isObs = node.shape === "obs";
        return (
          <g key={node.id} transform={`translate(${x} ${y})`}>
            {isDet ? (
              <polygon points="0,-13 13,0 0,13 -13,0" fill={vis.paper} stroke={vis.ink} strokeWidth="1.5" />
            ) : (
              <circle r="13" fill={isObs ? vis.ink : vis.paper} stroke={vis.ink} strokeWidth="1.5" />
            )}
            <Label textAnchor="middle" y="4" fontSize="11" fill={isObs && !isDet ? vis.paper : vis.ink} mono>
              {node.label}
            </Label>
          </g>
        );
      })}
    </PlateFrame>
  );
}

function SmallMultiples({ spec }: { spec: SmallMultiplesVisual }) {
  const n = Math.max(spec.panels.length, 1);
  const left = spec.yLabel ? 56 : 40;
  const width = (600 - left) / n;
  return (
    <PlateFrame>
      {spec.yLabel ? (
        <Label transform="translate(18 150) rotate(-90)" textAnchor="middle" fontSize="10" mute>
          {spec.yLabel}
        </Label>
      ) : null}
      {spec.panels.map((panel, i) => {
        const max = Math.max(...panel.bars.map((bar) => bar.value), 1);
        const slot = Math.max(width - 16, 24);
        const barW = Math.min(28, (slot / Math.max(panel.bars.length, 1)) * 0.55);
        const gap = slot / Math.max(panel.bars.length, 1);
        return (
          <g key={panel.title} transform={`translate(${left + i * width} 36)`}>
            <Label fontSize="11" weight={500}>
              {panel.title}
            </Label>
            <line x1="8" y1="210" x2={slot} y2="210" stroke={vis.ink} strokeWidth={vis.hair} />
            {panel.bars.map((bar, j) => {
              const bh = (bar.value / max) * 152;
              const cx = 8 + j * gap + gap / 2;
              const signal = bar.value === max;
              return (
                <g key={bar.label}>
                  <rect
                    x={cx - barW / 2}
                    y={210 - bh}
                    width={barW}
                    height={bh}
                    fill={signal ? vis.accent : vis.ink}
                  />
                  <Label x={cx} y="226" textAnchor="middle" fontSize="9.5" mute>
                    {bar.label}
                  </Label>
                </g>
              );
            })}
          </g>
        );
      })}
    </PlateFrame>
  );
}

function MechanismMap({ spec }: { spec: MechanismMapVisual }) {
  const marker = useContext(MarkerId);
  const byId = new Map(spec.nodes.map((node) => [node.id, node]));
  return (
    <PlateFrame>
      {spec.edges.map((edge) => {
        const a = byId.get(edge.from);
        const b = byId.get(edge.to);
        if (!a || !b) return null;
        const x1 = 20 + a.x * 6;
        const y1 = 28 + a.y * 2.6;
        const x2 = 20 + b.x * 6;
        const y2 = 28 + b.y * 2.6;
        const [sx, sy, ex, ey] = along(x1, y1, x2, y2, 22, 24);
        return (
          <g key={`${edge.from}-${edge.to}`}>
            <line x1={sx} y1={sy} x2={ex} y2={ey} stroke={vis.ink} strokeWidth={vis.sw} markerEnd={`url(#${marker})`} />
            {edge.label ? (
              <Label x={(sx + ex) / 2} y={(sy + ey) / 2 - 6} textAnchor="middle" fontSize="9.5" fill={vis.accent}>
                {edge.label}
              </Label>
            ) : null}
          </g>
        );
      })}
      {spec.nodes.map((node) => {
        const x = 20 + node.x * 6;
        const y = 28 + node.y * 2.6;
        const drug = node.group === "drug";
        return (
          <g key={node.id} transform={`translate(${x} ${y})`}>
            <rect
              x="-48"
              y="-18"
              width="96"
              height="36"
              fill={vis.paper}
              stroke={drug ? vis.accent : vis.ink}
              strokeWidth={vis.sw}
            />
            <Label textAnchor="middle" y={node.sub ? -2 : 4} fontSize="11" weight={500} fill={drug ? vis.accent : vis.ink}>
              {node.label}
            </Label>
            {node.sub ? (
              <Label textAnchor="middle" y="12" fontSize="9" mute>
                {node.sub}
              </Label>
            ) : null}
          </g>
        );
      })}
    </PlateFrame>
  );
}

function DensityShift({ spec }: { spec: DensityShiftVisual }) {
  const xs = spec.curves.flatMap((curve) => [curve.mean - 3 * curve.sd, curve.mean + 3 * curve.sd]);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const styles = spec.curves.map((_, i) => {
    if (i === 0) return { stroke: vis.ink, dash: undefined as string | undefined, fill: 0.07 };
    if (i === 1) return { stroke: vis.accent, dash: undefined, fill: 0.08 };
    return { stroke: vis.ink, dash: "4 3", fill: 0.04 };
  });
  return (
    <PlateFrame>
      {spec.curves.map((curve, i) => {
        const s = styles[i];
        return (
          <g key={curve.id}>
            <path
              d={densityPath(curve.mean, curve.sd, xMin, xMax, 48, 600, 214, 148)}
              fill={s.stroke}
              fillOpacity={s.fill}
              stroke={s.stroke}
              strokeWidth="1.6"
              strokeDasharray={s.dash}
            />
          </g>
        );
      })}
      <line x1="48" y1="214" x2="600" y2="214" stroke={vis.ink} strokeWidth={vis.hair} />
      <Label x="324" y="232" textAnchor="middle" fontSize="10.5" mute>
        {spec.xLabel}
      </Label>
      {spec.curves.map((curve, i) => {
        const s = styles[i];
        const col = spec.curves.length > 2 ? i % 3 : i;
        const row = spec.curves.length > 2 ? Math.floor(i / 3) : 0;
        const x = 48 + col * 190;
        const y = 258 + row * 16;
        return (
          <g key={`leg-${curve.id}`}>
            <line x1={x} y1={y - 3} x2={x + 16} y2={y - 3} stroke={s.stroke} strokeWidth="1.6" strokeDasharray={s.dash} />
            <Label x={x + 22} y={y} fontSize="10.5">
              {curve.label}
            </Label>
          </g>
        );
      })}
    </PlateFrame>
  );
}

function Hierarchy({ spec }: { spec: HierarchyVisual }) {
  const labelW = 138;
  const inner = 560;
  const layerH = Math.min(62, 232 / Math.max(spec.layers.length, 1));
  return (
    <PlateFrame>
      {spec.layers.map((layer, i) => {
        const y = 28 + i * layerH;
        const n = Math.max(layer.nodes.length, 1);
        const rest = inner - labelW;
        const gap = 6;
        const nodeW = Math.min(100, (rest - gap * (n - 1)) / n);
        return (
          <g key={layer.title} transform={`translate(36 ${y})`}>
            <Label y="22" fontSize={layer.title.length > 22 ? 10 : 11} weight={500}>
              {layer.title}
            </Label>
            {layer.nodes.map((node, j) => (
              <g key={`${node}-${j}`} transform={`translate(${labelW + j * (nodeW + gap)} 4)`}>
                <rect
                  width={nodeW}
                  height="28"
                  fill={vis.paper}
                  stroke={i === 0 ? vis.ink : vis.rule}
                  strokeWidth={i === 0 ? vis.sw : vis.hair}
                />
                <Label x={nodeW / 2} y="18" textAnchor="middle" fontSize={node.length > 14 ? 9 : 10.5}>
                  {node}
                </Label>
              </g>
            ))}
          </g>
        );
      })}
    </PlateFrame>
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
  const terms = spec.terms.slice(0, 12);
  const max = Math.max(...terms.map((term) => term.weight), 1);
  const row = terms.length ? Math.min(22, 232 / terms.length) : 22;
  return (
    <PlateFrame>
      {terms.map((term, i) => {
        const y = 40 + i * row;
        const bar = 24 + (term.weight / max) * 280;
        const top = i === 0;
        return (
          <g key={`${term.label}-${i}`}>
            <Label x="48" y={y} fontSize="10" mono mute>
              {String(i + 1).padStart(2, "0")}
            </Label>
            <Label x="84" y={y} fontSize="12" weight={top ? 500 : 400}>
              {term.label}
            </Label>
            <line
              x1="280"
              y1={y - 4}
              x2={280 + bar}
              y2={y - 4}
              stroke={top ? vis.accent : vis.ink}
              strokeWidth={top ? 2 : 1.25}
            />
          </g>
        );
      })}
    </PlateFrame>
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
