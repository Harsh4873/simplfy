export const vis = {
  ink: "#141414",
  mute: "#5c5c59",
  rule: "#c9c5bc",
  paper: "#fbfaf7",
  accent: "#c23a4a",
  sw: 1.25,
  hair: 0.75,
  sans: 'IBM Plex Sans, "Helvetica Neue", Helvetica, sans-serif',
  mono: "IBM Plex Mono, ui-monospace, monospace",
} as const;

/** Cream fills that used to paint the whole canvas column. Keep them off the stage. */
export const CREAM_STAGE = ["#efeee9", "#fafaf7"] as const;

export function gaussian(x: number, mean: number, sd: number): number {
  const z = (x - mean) / sd;
  return Math.exp(-0.5 * z * z);
}

export function densityPath(
  mean: number,
  sd: number,
  xMin: number,
  xMax: number,
  x0: number,
  x1: number,
  yBase: number,
  height: number,
): string {
  const n = 64;
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

export function along(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  startPad: number,
  endPad: number,
): [number, number, number, number] {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  return [x1 + ux * startPad, y1 + uy * startPad, x2 - ux * endPad, y2 - uy * endPad];
}
