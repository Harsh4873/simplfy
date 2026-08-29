/** ASCII PDF with a Helvetica text layer. Not a real paper. */
export function makeTextPdf(lines: string[], name = "toy-assay.pdf"): File {
  const escape = (value: string) => value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  const ops = ["BT", "/F1 12 Tf"];
  let y = 720;
  for (const line of lines) {
    ops.push(`1 0 0 1 72 ${y} Tm`, `(${escape(line)}) Tj`);
    y -= 18;
  }
  ops.push("ET");
  const stream = ops.join("\n");
  const objects: string[] = [];
  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[2] = "<< /Type /Pages /Kids [3 0 R] /Count 1 >>";
  objects[3] =
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>";
  objects[4] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
  objects[5] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";

  let body = "%PDF-1.4\n";
  const offsets = [0];
  for (let i = 1; i <= 5; i += 1) {
    offsets[i] = body.length;
    body += `${i} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xrefAt = body.length;
  body += `xref\n0 6\n0000000000 65535 f \n`;
  for (let i = 1; i <= 5; i += 1) {
    body += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  body += `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefAt}\n%%EOF\n`;
  return new File([body], name, { type: "application/pdf" });
}

export const TOY_PAPER_LINES = [
  "A toy assay for counting colonies on agar plates",
  "Jane Q Public",
  "Abstract",
  "We count colonies with a simple grid so a student can practice log-scale thinking without a real biosafety lab. The grid is eight by eight and each cell is one plate sector.",
  "1 Introduction",
  "Tuberculosis papers often hide behind CFU plots. This toy paper uses a made-up strain name ToyRv so the deck can ask what the abstract claimed.",
  "2 Methods",
  "Plates were split into sixty-four cells. Counts were log10 transformed before a paired comparison on the toy strain.",
  "3 Results",
  "The knockout was two logs lower than wild type after the drug pulse, which is the same story as a classic essentiality call.",
  "4 Discussion",
  "A student should be able to say the abstract back: a grid count, a log drop, and why that is not a p-value by itself.",
  "References",
  "Someone, A. (2019) Fake citation that should not become a recall card.",
];

export const TOY_PAPER_TEXT = TOY_PAPER_LINES.join("\n");

export const TOY_PAPER_MASHED = TOY_PAPER_LINES.join(" ");
