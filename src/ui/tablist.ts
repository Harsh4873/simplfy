import type { KeyboardEvent as ReactKeyboardEvent } from "react";

export function onTabListKeyDown(event: ReactKeyboardEvent<HTMLElement>) {
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
  if (event.key !== "ArrowRight" && event.key !== "ArrowLeft" && event.key !== "Home" && event.key !== "End") return;
  const target = event.target;
  if (
    target instanceof HTMLElement &&
    (target.isContentEditable || target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT")
  ) {
    return;
  }
  const tabs = [...event.currentTarget.querySelectorAll<HTMLElement>('[role="tab"]')];
  if (!tabs.length) return;
  const current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const index = current ? tabs.findIndex((tab) => tab === current || tab.contains(current)) : -1;
  if (index < 0) return;
  const next =
    event.key === "ArrowRight"
      ? (index + 1) % tabs.length
      : event.key === "ArrowLeft"
        ? (index - 1 + tabs.length) % tabs.length
        : event.key === "Home"
          ? 0
          : tabs.length - 1;
  event.preventDefault();
  const tab = tabs[next];
  if (!tab) return;
  for (const item of tabs) item.tabIndex = item === tab ? 0 : -1;
  tab.focus();
}
