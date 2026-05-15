import { config } from "../config.js";

// Minimal robots.txt enforcement: we only fetch a page if the site's
// robots.txt does not Disallow it for our agent (or for *).
const cache = new Map<string, string[]>(); // host -> disallowed path prefixes

async function loadDisallows(origin: string): Promise<string[]> {
  if (cache.has(origin)) return cache.get(origin)!;
  let disallows: string[] = [];
  try {
    const res = await fetch(`${origin}/robots.txt`, {
      headers: { "User-Agent": config.enrich.userAgent },
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      const txt = await res.text();
      let active = false;
      for (const lineRaw of txt.split(/\r?\n/)) {
        const line = lineRaw.replace(/#.*$/, "").trim();
        if (!line) continue;
        const [k, ...rest] = line.split(":");
        const key = k?.toLowerCase().trim();
        const val = rest.join(":").trim();
        if (key === "user-agent") active = val === "*" || val === "afs-leadengine";
        else if (key === "disallow" && active && val) disallows.push(val);
      }
    }
  } catch {
    disallows = [];
  }
  cache.set(origin, disallows);
  return disallows;
}

export async function isAllowed(targetUrl: string): Promise<boolean> {
  if (!config.enrich.respectRobots) return true;
  let u: URL;
  try {
    u = new URL(targetUrl);
  } catch {
    return false;
  }
  const disallows = await loadDisallows(u.origin);
  return !disallows.some((d) => d !== "/" && u.pathname.startsWith(d)) &&
    !disallows.includes("/");
}
