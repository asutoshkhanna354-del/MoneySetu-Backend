import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { setAuthTokenGetter, setBaseUrl } from "@workspace/api-client-react";

const apiBase = (import.meta.env.VITE_API_URL as string || "").replace(/\/$/, "");

if (apiBase) {
  setBaseUrl(apiBase);

  const _originalFetch = window.fetch.bind(window);

  // Rewrite /api/ paths to the Render backend URL
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    const resolved =
      typeof input === "string" && input.startsWith("/api/")
        ? `${apiBase}${input}`
        : input;
    return _originalFetch(resolved, init);
  };

  // Keepalive ping every 9 minutes — keeps Render free-tier warm
  const ping = () => _originalFetch(`${apiBase}/api/healthz`).catch(() => {});
  ping();
  setInterval(ping, 9 * 60 * 1000);
}

setAuthTokenGetter(() => localStorage.getItem("ev_token"));

createRoot(document.getElementById("root")!).render(<App />);
