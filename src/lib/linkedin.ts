// Free LinkedIn helpers — no API, no key. We can't *verify* a person from
// OpenStreetMap data, but we can hand the user a one-click LinkedIn search
// scoped to the business so they can find the decision-maker and paste back
// the real profile + name (then mark it verified). Egypt is region 0 on
// LinkedIn's geo filter, which biases people results to the right country.

const EGYPT_GEO = "106155005"; // LinkedIn geoUrn for Egypt

export function linkedinCompanySearch(name: string): string {
  return `https://www.linkedin.com/search/results/companies/?keywords=${encodeURIComponent(
    name,
  )}`;
}

export function linkedinPeopleSearch(
  companyName: string,
  city?: string | null,
): string {
  // Bias toward owners / GMs / procurement — the people who buy furniture.
  const keywords = [companyName, city ?? ""].filter(Boolean).join(" ");
  const params = new URLSearchParams({
    keywords,
    geoUrn: `["${EGYPT_GEO}"]`,
    origin: "FACETED_SEARCH",
  });
  return `https://www.linkedin.com/search/results/people/?${params.toString()}`;
}

// Pull a clean "in/handle" username out of a full LinkedIn profile URL for
// compact display. Returns null if it isn't a recognizable profile link.
export function linkedinUsername(url?: string | null): string | null {
  if (!url) return null;
  const m = url.match(/linkedin\.com\/in\/([^/?#]+)/i);
  return m ? decodeURIComponent(m[1]!) : null;
}
