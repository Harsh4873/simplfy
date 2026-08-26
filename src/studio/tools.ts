export type ToolId = "check" | "map" | "example" | "recall";

export const TOOLS: { id: ToolId; label: string }[] = [
  { id: "check", label: "Check" },
  { id: "map", label: "Map" },
  { id: "example", label: "Example" },
  { id: "recall", label: "Recall" },
];
