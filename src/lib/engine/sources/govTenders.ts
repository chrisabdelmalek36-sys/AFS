import { config } from "../config";
import { log } from "../util/logger";
import type { DiscoverContext, RawLead, Source } from "./types";

// Egyptian public-sector pipeline (Tourism Development Authority, NUCA,
// general tender portals). There is no single official free JSON API, so
// this adapter reads any RSS/Atom-style feed URLs you configure via
// GOV_FEED_URLS (comma-separated). Until configured it returns nothing —
// it never fabricates leads.
const FEEDS = (process.env.GOV_FEED_URLS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const TITLE_RE = /<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/gi;
const LINK_RE = /<link>(.*?)<\/link>/gi;
const DATE_RE = /<(?:pubDate|updated|published)>(.*?)<\//i;

export const govTenderSource: Source = {
  name: "gov_tender",
  async discover(ctx: DiscoverContext): Promise<RawLead[]> {
    if (FEEDS.length === 0) {
      log.info("gov_tender: no GOV_FEED_URLS configured — skipping");
      return [];
    }
    const out: RawLead[] = [];
    for (const feed of FEEDS) {
      try {
        const res = await fetch(feed, {
          headers: { "User-Agent": config.enrich.userAgent },
        });
        if (!res.ok) continue;
        const xml = await res.text();
        const titles = [...xml.matchAll(TITLE_RE)].map((m) => m[1]).slice(1);
        const links = [...xml.matchAll(LINK_RE)].map((m) => m[1]).slice(1);
        const date = xml.match(DATE_RE)?.[1];
        titles.forEach((t, i) => {
          if (!t) return;
          out.push({
            name: t.slice(0, 120),
            category: "developer",
            source: "gov_tender",
            sourceUrl: links[i],
            publishedAt: date,
            newsHot: true,
            raw: { feed, title: t },
          });
        });
      } catch (e) {
        log.warn("gov_tender feed failed:", feed, e);
      }
    }
    await ctx.budget.record("gov_tender", out.length, 0);
    log.info(`gov_tender: ${out.length} items`);
    return out;
  },
};
