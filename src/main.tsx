import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Studio } from "./studio/Studio";
import "./styles/global.css";

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root");

createRoot(root).render(
  <StrictMode>
    <Studio />
  </StrictMode>,
);
