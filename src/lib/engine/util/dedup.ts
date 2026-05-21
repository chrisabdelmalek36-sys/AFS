import { createHash } from "node:crypto";

// Egyptian phone normalization: strip everything non-digit, then collapse
// the common prefixes (+20 / 0020 / leading 0) to a canonical national form.
export function normalizePhone(raw?: string | null): string {
  if (!raw) return "";
  let d = raw.replace(/[^\d]/g, "");
  if (d.startsWith("0020")) d = d.slice(4);
  else if (d.startsWith("20") && d.length >= 11) d = d.slice(2);
  if (d.startsWith("0")) d = d.slice(1);
  return d;
}

const COMPANY_NOISE =
  /\b(co|company|corp|corporation|llc|ltd|limited|inc|group|holding|holdings|egypt|cairo|sae|s\.?a\.?e|the|for|and)\b/g;

export function normalizeName(raw?: string | null): string {
  if (!raw) return "";
  return raw
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s؀-ۿ]/g, " ")
    .replace(COMPANY_NOISE, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeAddress(raw?: string | null): string {
  if (!raw) return "";
  return raw
    .toLowerCase()
    .replace(/[^a-z0-9\s؀-ۿ]/g, " ")
    .replace(/\b(st|street|road|rd|ave|avenue|bldg|building|floor|fl)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// A lead is identified by phone + name + address. Phone is by far the
// strongest signal, so when a phone exists it IS the dedupe key (the same
// business listed by two sources with slightly different names/addresses
// must still collapse). With no phone we fall back to name+address.
// Never inserts a duplicate: this hash is the table's UNIQUE column.
export function dedupHash(p: {
  name?: string | null;
  phone?: string | null;
  address?: string | null;
}): string {
  const phone = normalizePhone(p.phone);
  const key =
    phone.length >= 7
      ? `PH:${phone}`
      : `NA:${normalizeName(p.name)}|${normalizeAddress(p.address)}`;
  return createHash("sha256").update(key).digest("hex");
}
