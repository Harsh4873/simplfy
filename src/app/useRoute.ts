import { useCallback, useMemo, useSyncExternalStore } from "react";
import { parseHash, toHash, type Route } from "./routes";

function subscribe(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

function snapshot() {
  return window.location.hash;
}

function serverSnapshot() {
  return "";
}

export function useRoute() {
  const hash = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const route = useMemo(() => parseHash(hash), [hash]);
  const navigate = useCallback((next: Route) => {
    const target = toHash(next);
    if (window.location.hash === target) {
      window.dispatchEvent(new HashChangeEvent("hashchange"));
      return;
    }
    window.location.hash = target;
  }, []);
  return { route, navigate, href: toHash };
}
