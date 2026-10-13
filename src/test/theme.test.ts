import { afterEach, describe, expect, it } from "vitest";
import { applyTheme, paintTheme, readExplicitTheme } from "../app/useTheme";

describe("theme preference", () => {
  afterEach(() => {
    localStorage.removeItem("simplfy-theme");
    document.documentElement.dataset.theme = "dark";
  });

  it("paints the page without freezing the OS choice", () => {
    localStorage.removeItem("simplfy-theme");
    paintTheme("light");
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(readExplicitTheme()).toBeNull();
  });

  it("writes storage only when the theme is applied on purpose", () => {
    applyTheme("dark");
    expect(readExplicitTheme()).toBe("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
  });
});
