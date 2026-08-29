import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Studio } from "../studio/Studio";

describe("studio shell", () => {
  it("opens a guided lesson for likelihood ratio test and rifampin", async () => {
    const user = userEvent.setup();
    render(<Studio />);
    const search = await screen.findByLabelText(/name a term/i);
    await user.clear(search);
    await user.type(search, "likelihood ratio test");
    await user.keyboard("{Enter}");
    expect(await screen.findByRole("heading", { level: 1, name: /likelihood ratio test/i })).toBeInTheDocument();
    expect(screen.getByText(/reduced model is a subset of the full parameter space/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /extra toppings on a pizza/i })).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: /practice/i }));
    expect(await screen.findByText(/when is a likelihood ratio test/i)).toBeInTheDocument();

    await user.clear(search);
    await user.type(search, "rifampin");
    await user.keyboard("{Enter}");
    expect(await screen.findByRole("heading", { level: 1, name: /rifampin and rpob/i })).toBeInTheDocument();
    expect(screen.getAllByText(/s450l/i).length).toBeGreaterThan(0);
  });

  it("files a pasted note in the library", async () => {
    const user = userEvent.setup();
    render(<Studio />);
    await user.click(screen.getByRole("link", { name: /^classes$/i }));
    const submit = await screen.findByRole("button", { name: /file in the studio/i });
    await waitFor(() => expect(submit).toBeEnabled());
    const area = screen.getByLabelText(/paste a paragraph/i);
    await user.type(area, "Caseum is hypoxic. PZA cares about pH.");
    await user.click(submit);
    expect(await screen.findByText(/note kept in the local library/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: /caseum is hypoxic/i })).toBeInTheDocument();
  });

  it("keeps a filed note after the studio remounts", async () => {
    const user = userEvent.setup();
    const view = render(<Studio />);
    await user.click(screen.getByRole("link", { name: /^classes$/i }));
    const submit = await screen.findByRole("button", { name: /file in the studio/i });
    await waitFor(() => expect(submit).toBeEnabled());
    await user.type(screen.getByLabelText(/paste a paragraph/i), "Heteroresistance is not a pipeline filter.");
    await user.click(submit);
    expect(await screen.findByRole("heading", { level: 1, name: /heteroresistance is not a pipeline filter/i })).toBeInTheDocument();
    view.unmount();
    render(<Studio />);
    expect(
      await screen.findByRole("heading", { level: 1, name: /heteroresistance is not a pipeline filter/i }),
    ).toBeInTheDocument();
  });

  it("opens a TnSeq lesson onto the desk", async () => {
    const user = userEvent.setup();
    render(<Studio />);
    const search = await screen.findByLabelText(/name a term/i);
    await user.clear(search);
    await user.type(search, "TRANSIT");
    await user.keyboard("{Enter}");
    expect(await screen.findByRole("heading", { level: 1, name: /tnseq and transit/i })).toBeInTheDocument();
    await user.click(screen.getByRole("tab", { name: /papers/i }));
    expect(await screen.findByText(/ioerger lab/i)).toBeInTheDocument();
    await user.click(screen.getByRole("link", { name: /^desk$/i }));
    expect(await screen.findByRole("heading", { level: 1, name: /desk/i })).toBeInTheDocument();
    expect(await screen.findByText(/tnseq and transit/i)).toBeInTheDocument();
  });

  it("opens a papers lookup onto the desk from search", async () => {
    const user = userEvent.setup();
    render(<Studio />);
    const search = await screen.findByLabelText(/name a term/i);
    await user.clear(search);
    await user.type(search, "prpD");
    await user.click(screen.getByRole("button", { name: /look up prpd/i }));
    expect(await screen.findByRole("heading", { level: 1, name: /^papers$/i })).toBeInTheDocument();
    expect(screen.getByText(/^ioerger lab$/i)).toBeInTheDocument();
    expect(screen.getByText(/griffin/i)).toBeInTheDocument();
    expect(screen.queryByText(/^people he writes with$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/level 1/i)).not.toBeInTheDocument();
    await user.click(screen.getByRole("link", { name: /^desk$/i }));
    expect(await screen.findByText(/lookup · prpd/i)).toBeInTheDocument();
  });

  it("teaches the central limit theorem instead of recycling the LRT pizza", async () => {
    const user = userEvent.setup();
    render(<Studio />);
    const search = await screen.findByLabelText(/name a term/i);
    await user.clear(search);
    await user.type(search, "central limit theorem");
    await user.keyboard("{Enter}");
    expect(await screen.findByRole("heading", { level: 1, name: /normal law and the central limit theorem/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /crowd of dice/i })).toBeInTheDocument();
  });

  it("files a dropped lecture folder as a class and spawns desk canvases", async () => {
    const user = userEvent.setup();
    render(<Studio />);
    await user.click(screen.getByRole("link", { name: /^classes$/i }));
    await user.type(screen.getByLabelText(/name this class/i), "TB methods");
    const input = await screen.findByLabelText(/^choose files$/i);
    const a = new File(["# TRANSIT\n\nHimar1 TnSeq essentiality."], "tnseq.md", { type: "text/markdown" });
    const b = new File(["# rpoB\n\nRifampin RRDR S450L."], "rpob.md", { type: "text/markdown" });
    Object.defineProperty(a, "webkitRelativePath", { value: "TB651/week1/tnseq.md" });
    Object.defineProperty(b, "webkitRelativePath", { value: "TB651/week1/rpob.md" });
    await user.upload(input, [a, b]);
    expect(await screen.findByRole("heading", { level: 1, name: /tb methods/i })).toBeInTheDocument();
    await user.click(screen.getByRole("link", { name: /^desk$/i }));
    expect(await screen.findByRole("button", { name: /tb methods/i })).toBeInTheDocument();
  });

  it("names an update folder from the README and builds a deck from those notes", async () => {
    const user = userEvent.setup();
    render(<Studio />);
    await user.click(screen.getByRole("link", { name: /^classes$/i }));
    const chooseFolder = await screen.findByRole("button", { name: /choose folder/i });
    await waitFor(() => expect(chooseFolder).toBeEnabled());
    const folder = screen.getByLabelText(/^choose folder$/i);
    const readme = new File(
      ["# CSCE 627 — update pack (read this folder)\n\nThis folder is the briefing for the course."],
      "README.md",
      { type: "text/markdown" },
    );
    const lecture = new File(
      [
        "# Last class\n\n## DFA 5-tuple\n\nA DFA is the 5-tuple (Q, Sigma, delta, q0, F). Accept states may be empty or many.\n",
      ],
      "last-class.md",
      { type: "text/markdown" },
    );
    Object.defineProperty(readme, "webkitRelativePath", { value: "update/README.md" });
    Object.defineProperty(lecture, "webkitRelativePath", { value: "update/last-class.md" });
    await user.upload(folder, [readme, lecture]);
    expect(await screen.findByRole("heading", { level: 1, name: /csce 627/i })).toBeInTheDocument();
    expect(screen.getAllByText("README.md").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/last-class\.md/i).length).toBeGreaterThan(0);
    expect(screen.queryByRole("heading", { name: /tnseq/i })).not.toBeInTheDocument();
    expect(screen.getByText(/recall card from the notes/i)).toBeInTheDocument();
    await user.click(screen.getAllByRole("button", { name: /^recall this class$/i })[0]);
    expect(await screen.findAllByText(/5-tuple/i)).not.toHaveLength(0);
  });

  it("replaces leftover class files when you drop an update folder", async () => {
    const user = userEvent.setup();
    render(<Studio />);
    await user.click(screen.getByRole("link", { name: /^classes$/i }));
    await user.type(screen.getByLabelText(/name this class/i), "Temp name");
    const open = await screen.findByRole("button", { name: /open empty class/i });
    await waitFor(() => expect(open).toBeEnabled());
    await user.click(open);
    expect(await screen.findByRole("heading", { level: 1, name: /temp name/i })).toBeInTheDocument();
    const leftover = new File(["# leftover inbox note\n\nNot part of the pack."], "leftover.md", {
      type: "text/markdown",
    });
    await user.upload(screen.getByLabelText(/^choose files$/i), [leftover]);
    expect((await screen.findAllByText("leftover.md")).length).toBeGreaterThan(0);
    await waitFor(() => expect(screen.queryByText(/filed 1 note/i)).toBeInTheDocument());
    const folder = screen.getByLabelText(/^choose folder$/i);
    const readme = new File(
      ["# CSCE 627 — update pack (read this folder)\n\nThis folder is the briefing for the course."],
      "README.md",
      { type: "text/markdown" },
    );
    const lecture = new File(
      ["# Last class\n\n## DFA 5-tuple\n\nA DFA is the 5-tuple (Q, Sigma, delta, q0, F). Accept states may be empty or many.\n"],
      "last-class.md",
      { type: "text/markdown" },
    );
    Object.defineProperty(readme, "webkitRelativePath", { value: "update/README.md" });
    Object.defineProperty(lecture, "webkitRelativePath", { value: "update/last-class.md" });
    await user.upload(folder, [readme, lecture]);
    expect(await screen.findByRole("heading", { level: 1, name: /csce 627/i })).toBeInTheDocument();
    await waitFor(() => expect(screen.getAllByText("README.md").length).toBeGreaterThan(0));
    expect(screen.getAllByText(/last-class\.md/i).length).toBeGreaterThan(0);
    expect(screen.queryAllByText("leftover.md")).toHaveLength(0);
  });

  it("renames a class", async () => {
    const user = userEvent.setup();
    render(<Studio />);
    await user.click(screen.getByRole("link", { name: /^classes$/i }));
    await user.type(screen.getByLabelText(/name this class/i), "Temp name");
    const open = await screen.findByRole("button", { name: /open empty class/i });
    await waitFor(() => expect(open).toBeEnabled());
    await user.click(screen.getByRole("button", { name: /open empty class/i }));
    expect(await screen.findByRole("heading", { level: 1, name: /temp name/i })).toBeInTheDocument();
    const rename = screen.getByLabelText(/rename class/i);
    await user.clear(rename);
    await user.type(rename, "CSCE 627");
    await user.click(screen.getByRole("button", { name: /save name/i }));
    expect(await screen.findByRole("heading", { level: 1, name: /csce 627/i })).toBeInTheDocument();
  });

  it("spawns class studios from a pasted lecture paragraph", async () => {
    const user = userEvent.setup();
    render(<Studio />);
    await user.click(screen.getByRole("link", { name: /^classes$/i }));
    await user.type(screen.getByLabelText(/name this class/i), "Host immunology");
    await user.click(screen.getByRole("button", { name: /open empty class/i }));
    expect(await screen.findByRole("heading", { level: 1, name: /host immunology/i })).toBeInTheDocument();
    const submit = await screen.findByRole("button", { name: /file in the studio/i });
    await waitFor(() => expect(submit).toBeEnabled());
    await user.type(
      screen.getByLabelText(/paste a paragraph into this class/i),
      "Himar1 TnSeq with TRANSIT. Essentiality calls on cholesterol, prpD.",
    );
    await user.click(submit);
    expect(await screen.findByText(/note kept in the local library/i)).toBeInTheDocument();
    await user.click(screen.getByRole("link", { name: /^desk$/i }));
    expect(await screen.findByRole("button", { name: /host immunology/i })).toBeInTheDocument();
  });

  it("switches between light and dark themes", async () => {
    const user = userEvent.setup();
    render(<Studio />);
    const toggle = await screen.findByRole("button", { name: /switch to (light|dark) theme/i });
    const start = document.documentElement.dataset.theme;
    await user.click(toggle);
    expect(document.documentElement.dataset.theme).not.toBe(start);
    await user.click(toggle);
    expect(document.documentElement.dataset.theme).toBe(start);
  });
});
