import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { setAuthTokenGetter } from "@workspace/api-client-react";

// All /api/ requests go to same domain — Netlify proxies them to Render
// Keepalive ping keeps the Render+Neon backend warm
const ping = () => fetch("/api/healthz").catch(() => {});
ping();
setInterval(ping, 9 * 60 * 1000);

setAuthTokenGetter(() => localStorage.getItem("ev_token"));

createRoot(document.getElementById("root")!).render(<App />);
