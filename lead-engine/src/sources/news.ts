import { config } from "../config.js";
import { log } from "../lib/logger.js";
import type { DiscoverContext, RawLead, Source } from "./types.js";

const DEVELOPERS = [
  "Emaar", "SODIC", "Palm Hills", "Tatweer Misr", "Hassan Allam",
  "Orascom", "Mountain View", "Madinet Masr", "Talaat Moustafa", "Ora Developers",
];

const QUERIES = [
  "new hotel Egypt", "resort opening Egypt", "compound launch Egypt",
  "restaurant chain expansion Egypt", "developer announces Egypt",
  "Tourism Development Authority Egypt", "NUCA project", "Ras El Hekma",
  ...DEVELOPERS.map((d) => `${d} project`),
];

const HOT = /\b(launch|announce|open|expansion|new (project|phase|hotel|resort|compound)|invest|develop)\b/i;

function attributeName(title: string): string {
  const hit = DEVELOPERS.find((d) =>
    title.toLowerCase().includes(d.toLowerCase()),
  );
  return hit ?? title.replace(/\s+[-|–].*$/, "").slice(0, 90);
}

function categoryOf(title: string): string {
  const t = title.toLowerCase();
  if (t.includes("hotel") || t.includes("resort")) return "hotel";
  if (t.includes("restaurant") || t.includes("f&b") || t.includes("cafe"))
    return "restaurant";
  return "developer";
}

async function fromGdelt(): Promise<RawLead[]> {
  const out: RawLead[] = [];
  for (const q of QUERIES) {
    const url =
      "https://api.gdeltproject.org/api/v2/doc/doc?query=" +
      encodeURIComponent(`${q} sourcecountry:EG`) +
      "&mode=ArtList&format=json&maxrecords=20&timespan=14d";
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": config.enrich.userAgent },
      });
      if (!res.ok) continue;
      const json = (await res.json()) as {
        articles?: { title: string; url: string; seendate?: string }[];
      };
      for (const a of json.articles ?? []) {
        if (!a.title) continue;
        out.push({
          name: attributeName(a.title),
          category: categoryOf(a.title),
          source: "gdelt",
          sourceUrl: a.url,
          publishedAt: a.seendate,
          newsHot: HOT.test(a.title),
          raw: { headline: a.title },
        });
      }
    } catch (e) {
      log.warn("GDELT query failed:", q, e);
    }
  }
  return out;
}

async function fromNewsApi(): Promise<RawLead[]> {
  const out: RawLead[] = [];
  for (const q of QUERIES) {
    const url =
      "https://newsapi.org/v2/everything?language=en&sortBy=publishedAt&pageSize=20&q=" +
      encodeURIComponent(q) +
      `&apiKey=${config.news.newsApiKey}`;
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const json = (await res.json()) as {
        articles?: { title: string; url: string; publishedAt?: string }[];
      };
      for (const a of json.articles ?? []) {
        if (!a.title) continue;
        out.push({
          name: attributeName(a.title),
          category: categoryOf(a.title),
          source: "newsapi",
          sourceUrl: a.url,
          publishedAt: a.publishedAt,
          newsHot: HOT.test(a.title),
          raw: { headline: a.title },
        });
      }
    } catch (e) {
      log.warn("NewsAPI query failed:", q, e);
    }
  }
  return out;
}

export const newsSource: Source = {
  name: "news",
  async discover(ctx: DiscoverContext): Promise<RawLead[]> {
    const out: RawLead[] = [];
    if (config.news.gdeltEnabled) {
      const g = await fromGdelt();
      await ctx.budget.record("gdelt", g.length, 0);
      out.push(...g);
    }
    if (config.news.newsApiKey) {
      const n = await fromNewsApi();
      await ctx.budget.record("newsapi", n.length, 0);
      out.push(...n);
    } else {
      log.warn("NEWSAPI_KEY missing — using GDELT only (free)");
    }
    log.info(`News: ${out.length} raw items`);
    return out;
  },
};
