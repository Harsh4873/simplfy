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
    await user.click(screen.getByRole("link", { name: /^notes$/i }));
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
    await user.click(screen.getByRole("link", { name: /^notes$/i }));
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
