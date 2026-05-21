import { config } from "../config";
import { isAllowed } from "./robots";
import { log } from "../util/logger";

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;
const JUNK = /\.(png|jpg|jpeg|gif|svg|webp)$/i;

async function getText(url: string): Promise<string | null> {
  if (!(await isAllowed(url))) {
    log.info(`robots.txt disallows ${url} — skipping`);
    return null;
  }
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": config.enrich.userAgent },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return null;
    return (await res.text()).slice(0, 400_000);
  } catch {
    return null;
  }
}

// Pick the most "business" email: prefer same-domain, then info@/sales@/contact@.
function bestEmail(emails: string[], host: string): string | undefined {
  const clean = [...new Set(emails.map((e) => e.toLowerCase()))].filter(
    (e) => !JUNK.test(e) && !e.includes("example.") && !e.includes("sentry"),
  );
  if (clean.length === 0) return undefined;
  const dom = host.replace(/^www\./, "");
  const sameDom = clean.filter((e) => e.endsWith(`@${dom}`));
  const pool = sameDom.length ? sameDom : clean;
  const pref = ["sales@", "info@", "contact@", "hello@", "marketing@"];
  for (const p of pref) {
    const m = pool.find((e) => e.startsWith(p));
    if (m) return m;
  }
  return pool[0];
}

// Only scrapes a business's OWN website for a business email — never
// personal data, never third-party profiles. Respects robots.txt.
export async function findWebsiteEmail(
  website?: string | null,
): Promise<string | undefined> {
  if (!config.enrich.websiteEmails || !website) return undefined;
  let base: URL;
  try {
    base = new URL(website);
  } catch {
    return undefined;
  }
  const candidates = [
    website,
    new URL("/contact", base).toString(),
    new URL("/contact-us", base).toString(),
    new URL("/about", base).toString(),
  ];
  const found: string[] = [];
  for (const c of candidates) {
    const html = await getText(c);
    if (!html) continue;
    found.push(...(html.match(EMAIL_RE) ?? []));
    if (found.length) break;
  }
  return bestEmail(found, base.host);
}
