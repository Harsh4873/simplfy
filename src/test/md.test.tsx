import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { loadCatalog } from "../catalog/loadCatalog";
import { parseDroppedFile, mimeForDroppedFile } from "../library/parse";
import { composeBrief } from "../md/compose";
import { Studio } from "../studio/Studio";
import { CREAM_STAGE } from "../visuals/theme";
import { GOLDEN_LRT_NOTE } from "./goldenLrtNote";

function tableText(brief: ReturnType<typeof composeBrief>): string {
  return brief.blocks
    .filter((block) => block.kind === "table")
    .flatMap((block) => (block.kind === "table" ? block.rows.flat() : []))
    .join(" ");
}

describe("lab brief pipeline", () => {
  const { modules } = loadCatalog();

  it("parses a dropped .md dump, strips fluff, and composes a brief", async () => {
    const file = new File([GOLDEN_LRT_NOTE], "lrt-note.md", { type: "text/plain" });
    expect(mimeForDroppedFile(file)).toBe("text/markdown");
    const parsed = await parseDroppedFile(file);
    expect(parsed.text).toContain("/workspace/canvases");
    expect(parsed.text).toContain(".canvas.tsx");

    const brief = composeBrief(parsed.text, modules);
    expect(brief.stripped).not.toMatch(/\/Users\/harshdave/);
    expect(brief.stripped).not.toMatch(/\.canvas\.tsx/);
    expect(brief.stripped).not.toMatch(/beside the chat/i);
    expect(brief.stripped).not.toMatch(/Park it/i);
    expect(brief.stripped).not.toMatch(/Don['\u2019]t write the ESX story/i);
    expect(brief.stripped).toMatch(/prpD/);
    expect(brief.title).not.toMatch(/^There are/i);
    expect(brief.title).not.toMatch(/\*\*/);
    expect(tableText(brief)).toMatch(/prpD/);
    expect(tableText(brief)).toMatch(/cmaA2/);
    expect(brief.title).toMatch(/prpRDC/i);
    expect(brief.title).toMatch(/cmaA2/i);
    expect(brief.links.some((link) => link.moduleId === "stats-lrt")).toBe(true);
    expect(brief.links.some((link) => link.moduleId === "tb-rifampin")).toBe(true);
    expect(brief.links.every((link) => link.text.toLowerCase() !== "interaction")).toBe(true);
    expect(brief.blocks.some((block) => block.kind === "figure")).toBe(true);
    expect(brief.blocks.some((block) => block.kind === "figure" && block.spec.kind === "small-multiples")).toBe(true);
  });

  it("files the golden paste as a readable brief on the canvas", async () => {
    const user = userEvent.setup();
    render(<Studio />);
    await user.click(screen.getByRole("link", { name: /^sources$/i }));
    const submit = await screen.findByRole("button", { name: /file in the studio/i });
    await waitFor(() => expect(submit).toBeEnabled());
    const area = screen.getByLabelText(/paste markdown/i);
    await user.click(area);
    await user.paste(GOLDEN_LRT_NOTE);
    await user.click(submit);

    expect(await screen.findByRole("heading", { level: 1, name: /LRT workbooks/i })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 1, name: /^There are/i })).not.toBeInTheDocument();
    expect(document.querySelector(".brief-table")?.textContent).toMatch(/prpD/);
    expect(document.querySelector(".brief-table")?.textContent).toMatch(/cmaA2/);
    expect(document.querySelector(".brief")?.textContent).not.toMatch(/\/Users\/harshdave/);
    expect(document.querySelector(".brief")?.textContent).not.toMatch(/beside the chat/i);
    const lrtLinks = screen.getAllByRole("button").filter((node) => node.classList.contains("plate-link") && /LRT/i.test(node.textContent ?? ""));
    expect(lrtLinks.length).toBeGreaterThan(0);
    expect(document.querySelector(".plate")).toBeTruthy();
    expect(document.querySelector(".raw-dump pre")?.textContent).toContain("/workspace/canvases");
  });

  it("defines light and dark themes without the old cream chassis tokens", () => {
    const css = readFileSync(resolve(process.cwd(), "src/styles/global.css"), "utf8");
    expect(css).toMatch(/\[data-theme="light"\]/);
    expect(css).toMatch(/\[data-theme="dark"\]/);
    expect(css).toMatch(/\.stage\s*\{/);
    expect(css).toMatch(/background:\s*var\(--bg\)/);
    for (const token of CREAM_STAGE) {
      expect(css).not.toContain(`--well: ${token}`);
      expect(css).not.toContain(`--plate: ${token}`);
    }
  });
});
