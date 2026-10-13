import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { onTabListKeyDown } from "../ui/tablist";

function Tabs() {
  return (
    <div role="tablist" aria-label="Sample" onKeyDown={onTabListKeyDown}>
      <button type="button" role="tab">
        One
      </button>
      <button type="button" role="tab">
        Two
      </button>
      <button type="button" role="tab">
        Three
      </button>
    </div>
  );
}

describe("tab lists", () => {
  it("moves focus with arrows, Home, and End", () => {
    render(<Tabs />);
    const one = screen.getByRole("tab", { name: "One" });
    const two = screen.getByRole("tab", { name: "Two" });
    const three = screen.getByRole("tab", { name: "Three" });
    one.focus();
    fireEvent.keyDown(one, { key: "ArrowRight" });
    expect(two).toHaveFocus();
    expect(two).toHaveAttribute("tabindex", "0");
    expect(one).toHaveAttribute("tabindex", "-1");
    fireEvent.keyDown(two, { key: "End" });
    expect(three).toHaveFocus();
    fireEvent.keyDown(three, { key: "Home" });
    expect(one).toHaveFocus();
    fireEvent.keyDown(one, { key: "ArrowLeft" });
    expect(three).toHaveFocus();
  });

  it("leaves modified arrow keys alone", () => {
    render(<Tabs />);
    const one = screen.getByRole("tab", { name: "One" });
    one.focus();
    fireEvent.keyDown(one, { key: "ArrowRight", altKey: true });
    expect(one).toHaveFocus();
    fireEvent.keyDown(one, { key: "Home", ctrlKey: true });
    expect(one).toHaveFocus();
  });
});
