import { createHmac } from "node:crypto";

// AFS legal footer details. Override via env in production.
export const AFS = {
  company: process.env.AFS_COMPANY ?? "AFS Trade",
  address:
    process.env.AFS_PHYSICAL_ADDRESS ??
    "AFS Trade, Cairo, Egypt (set AFS_PHYSICAL_ADDRESS in .env)",
  fromEmail: process.env.AFS_FROM_EMAIL ?? "sales@afstrade.example",
  baseUrl: process.env.PUBLIC_BASE_URL ?? "http://localhost:3000",
};

const SECRET = process.env.UNSUBSCRIBE_SECRET ?? "afs-dev-unsubscribe-secret";

export function unsubToken(leadId: number): string {
  return createHmac("sha256", SECRET)
    .update(String(leadId))
    .digest("base64url")
    .slice(0, 32);
}

export function verifyUnsub(leadId: number, token: string): boolean {
  const expected = unsubToken(leadId);
  // constant-time-ish compare
  return (
    token.length === expected.length &&
    createHmac("sha256", SECRET).update(token).digest("hex") ===
      createHmac("sha256", SECRET).update(expected).digest("hex")
  );
}

export function unsubscribeUrl(leadId: number): string {
  return `${AFS.baseUrl}/api/unsubscribe?lead=${leadId}&token=${unsubToken(
    leadId,
  )}`;
}

// Every cold email MUST carry an unsubscribe link + a physical address.
export function emailFooter(leadId: number): string {
  return [
    "",
    "—",
    `${AFS.company} — 33 years sole distributor of Nardi (Italy) in Egypt.`,
    AFS.address,
    `Unsubscribe (you will never be contacted again): ${unsubscribeUrl(leadId)}`,
  ].join("\n");
}
